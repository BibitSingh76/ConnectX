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
      const guestTag = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}@guest.connectx.local`;
      hostUser = await User.create({
        name: hostName,
        email: guestTag,
        isGuest: true,
      });
    }

    const effectiveHostName = hostUser ? hostUser.name : hostName || 'Host';

    // Check if meeting with ID already exists
    let meeting = await Meeting.findOne({ meetingId });

    if (meeting) {
      if (meeting.status === 'ended') {
        // Re-open meeting if previously ended
        meeting.status = 'active';
        meeting.startTime = new Date();
        meeting.endTime = null;
        meeting.duration = 0;
        await meeting.save();
      }
      return this.getMeetingById(meetingId);
    }

    meeting = await Meeting.create({
      meetingId,
      title: title || 'ConnectX 1:1 Session',
      host: hostUser ? hostUser._id : null,
      hostName: effectiveHostName,
      status: 'active',
      startTime: new Date(),
    });

    const hostParticipant = await MeetingParticipant.create({
      meetingId,
      user: hostUser ? hostUser._id : null,
      displayName: effectiveHostName,
      role: 'host',
      status: 'joined',
      joinedAt: new Date(),
    });

    meeting.participants.push(hostParticipant._id);
    await meeting.save();

    return this.getMeetingById(meetingId);
  }

  /**
   * Fetch meeting details by unique meetingId
   */
  async getMeetingById(meetingId) {
    const meeting = await Meeting.findOne({ meetingId })
      .populate('host', 'name email avatar isGuest')
      .populate('participants');

    if (!meeting) {
      const err = new Error(`Meeting not found for ID: ${meetingId}`);
      err.statusCode = 404;
      throw err;
    }

    return meeting;
  }

  /**
   * Join an active meeting
   */
  async joinMeeting({ meetingId, userId, displayName }) {
    const meeting = await Meeting.findOne({ meetingId }).populate('participants');

    if (!meeting) {
      const err = new Error(`Meeting not found for ID: ${meetingId}`);
      err.statusCode = 404;
      throw err;
    }

    if (meeting.status === 'ended') {
      const err = new Error(`Meeting ${meetingId} has already ended`);
      err.statusCode = 400;
      throw err;
    }

    let participant = null;

    if (userId) {
      participant = await MeetingParticipant.findOne({ meetingId, user: userId });
    }

    if (!participant && displayName) {
      participant = await MeetingParticipant.findOne({ meetingId, displayName });
    }

    if (participant) {
      participant.status = 'joined';
      participant.joinedAt = new Date();
      participant.leftAt = null;
      await participant.save();
    } else {
      let userDoc = null;
      if (userId) {
        userDoc = await User.findById(userId);
      } else if (displayName) {
        const guestTag = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}@guest.connectx.local`;
        userDoc = await User.create({
          name: displayName,
          email: guestTag,
          isGuest: true,
        });
      }

      participant = await MeetingParticipant.create({
        meetingId,
        user: userDoc ? userDoc._id : null,
        displayName: userDoc ? userDoc.name : displayName || 'Guest Participant',
        role: meeting.participants.length === 0 ? 'host' : 'participant',
        status: 'joined',
        joinedAt: new Date(),
      });

      meeting.participants.push(participant._id);
      await meeting.save();
    }

    return this.getMeetingById(meetingId);
  }

  /**
   * Record a participant leaving the meeting
   */
  async leaveMeeting({ meetingId, userId, displayName }) {
    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) return null;

    let query = { meetingId, status: 'joined' };
    if (userId) {
      query.user = userId;
    } else if (displayName) {
      query.displayName = displayName;
    }

    const participant = await MeetingParticipant.findOne(query);
    if (participant) {
      participant.status = 'left';
      participant.leftAt = new Date();
      await participant.save();
    }

    return this.getMeetingById(meetingId);
  }

  /**
   * Mark a meeting as ended and compute duration
   */
  async endMeeting(meetingId, requestingUserId = null) {
    const meeting = await Meeting.findOne({ meetingId }).populate('participants');
    if (!meeting) {
      const err = new Error(`Meeting not found for ID: ${meetingId}`);
      err.statusCode = 404;
      throw err;
    }

    if (meeting.status === 'ended') {
      return this.getMeetingById(meetingId);
    }

    // Authorization check: If meeting has an authenticated host user
    if (meeting.host) {
      const hostIdStr = meeting.host._id ? meeting.host._id.toString() : meeting.host.toString();
      const reqIdStr = requestingUserId ? requestingUserId.toString() : null;

      const isHost = reqIdStr && reqIdStr === hostIdStr;
      const isParticipant = reqIdStr && meeting.participants.some(
        (p) => p.user && p.user.toString() === reqIdStr
      );

      if (!isHost && !isParticipant) {
        const err = new Error('Not authorized to end another user\'s meeting');
        err.statusCode = 403;
        throw err;
      }
    }

    const endTime = new Date();
    const durationSeconds = Math.round((endTime.getTime() - new Date(meeting.startTime).getTime()) / 1000);

    meeting.status = 'ended';
    meeting.endTime = endTime;
    meeting.duration = durationSeconds;
    await meeting.save();

    // Mark all active participants as left
    await MeetingParticipant.updateMany(
      { meetingId, status: 'joined' },
      { $set: { status: 'left', leftAt: endTime } }
    );

    return this.getMeetingById(meetingId);
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
        .populate('host', 'name email avatar')
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
        .populate('host', 'name email avatar')
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
