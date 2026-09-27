const { Meeting, MeetingParticipant, User } = require('../models');

class MeetingService {
  /**
   * Create a new meeting room session
   */
  async createMeeting({ meetingId, title, hostName, hostId }) {
    let hostUser = null;

    if (hostId) {
      hostUser = await User.findById(hostId);
    } else if (hostName) {
      hostUser = await User.create({
        name: hostName,
        isGuest: true,
      });
    }

    const meeting = await Meeting.create({
      meetingId,
      title: title || 'ConnectX 1:1 Session',
      host: hostUser ? hostUser._id : null,
      status: 'active',
      startTime: new Date(),
    });

    if (hostUser) {
      const hostParticipant = await MeetingParticipant.create({
        meetingId,
        user: hostUser._id,
        displayName: hostUser.name || hostName,
        role: 'host',
      });
      meeting.participants.push(hostParticipant._id);
      await meeting.save();
    }

    return meeting;
  }

  /**
   * Fetch meeting details by unique meetingId or Mongo ID
   */
  async getMeetingById(meetingId) {
    const meeting = await Meeting.findOne({ meetingId })
      .populate('host', 'name email avatar')
      .populate('participants');

    if (!meeting) {
      const err = new Error(`Meeting not found for ID: ${meetingId}`);
      err.statusCode = 404;
      throw err;
    }

    return meeting;
  }

  /**
   * Mark a meeting as ended and compute duration
   */
  async endMeeting(meetingId) {
    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) {
      const err = new Error(`Meeting not found for ID: ${meetingId}`);
      err.statusCode = 404;
      throw err;
    }

    if (meeting.status === 'ended') {
      return meeting;
    }

    const endTime = new Date();
    const durationSeconds = Math.round((endTime.getTime() - new Date(meeting.startTime).getTime()) / 1000);

    meeting.status = 'ended';
    meeting.endTime = endTime;
    meeting.duration = durationSeconds;

    await meeting.save();
    return meeting;
  }

  /**
   * Get overall meeting metrics and summary for dashboard
   */
  async getSummaryMetrics() {
    const [totalMeetings, activeCount, durationResult, recentMeetings] = await Promise.all([
      Meeting.countDocuments(),
      Meeting.countDocuments({ status: 'active' }),
      Meeting.aggregate([{ $group: { _id: null, totalDuration: { $sum: '$duration' } } }]),
      Meeting.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('host', 'name email')
        .populate('participants'),
    ]);

    const totalDurationSeconds = durationResult.length > 0 ? durationResult[0].totalDuration : 0;

    return {
      totalMeetings,
      activeCount,
      totalDurationSeconds,
      recentMeetings,
    };
  }

  /**
   * List all meetings with optional status filtering
   */
  async listMeetings({ status, limit = 20, page = 1 }) {
    const query = {};
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [meetings, total] = await Promise.all([
      Meeting.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('host', 'name email')
        .populate('participants'),
      Meeting.countDocuments(query),
    ]);

    return {
      meetings,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new MeetingService();
