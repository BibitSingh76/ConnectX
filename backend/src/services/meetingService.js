const { Meeting, MeetingParticipant, User } = require('../models');

class MeetingService {
  /**
   * Fetch meeting details by unique meetingId with lean() and field selection
   */
  async getMeetingById(meetingId) {
    const meeting = await Meeting.findOne({ meetingId })
      .populate('host', 'name email avatar isGuest')
      .populate({
        path: 'participants',
        select: 'displayName role status joinedAt leftAt user',
      })
      .lean();

    if (!meeting) {
      const err = new Error(`Meeting not found for ID: ${meetingId}`);
      err.statusCode = 404;
      throw err;
    }

    return meeting;
  }

  /**
   * Create a new meeting room session (Authenticated Host Only)
   */
  async createMeeting({ meetingId, title, hostId, hostName }) {
    if (!hostId) {
      const err = new Error('Authentication required to create a meeting');
      err.statusCode = 401;
      throw err;
    }

    const hostUser = await User.findById(hostId).select('name email avatar isGuest').lean();
    if (!hostUser) {
      const err = new Error('Authentication required to create a meeting');
      err.statusCode = 401;
      throw err;
    }

    const effectiveHostName = hostUser.name;

    // Check if meeting with ID already exists
    const existingMeeting = await Meeting.findOne({ meetingId }).lean();

    if (existingMeeting) {
      if (existingMeeting.status === 'ended') {
        // Re-open meeting if previously ended
        await Meeting.updateOne(
          { meetingId },
          { $set: { status: 'active', host: hostUser._id, hostName: effectiveHostName, startTime: new Date(), endTime: null, duration: 0 } }
        );
      }
      return this.getMeetingById(meetingId);
    }

    const hostParticipant = await MeetingParticipant.create({
      meetingId,
      user: hostUser._id,
      displayName: effectiveHostName,
      role: 'host',
      status: 'joined',
      joinedAt: new Date(),
    });

    await Meeting.create({
      meetingId,
      title: title || 'ConnectX 1:1 Session',
      host: hostUser._id,
      hostName: effectiveHostName,
      status: 'active',
      startTime: new Date(),
      participants: [hostParticipant._id],
    });

    return this.getMeetingById(meetingId);
  }

  /**
   * Join an active meeting
   */
  async joinMeeting({ meetingId, userId, displayName }) {
    const meeting = await Meeting.findOne({ meetingId }).select('_id status participants').lean();

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

    // Consolidated single participant lookup query using $or
    const participantQuery = { meetingId };
    if (userId && displayName) {
      participantQuery.$or = [{ user: userId }, { displayName }];
    } else if (userId) {
      participantQuery.user = userId;
    } else if (displayName) {
      participantQuery.displayName = displayName;
    }

    let participant = await MeetingParticipant.findOne(participantQuery).lean();

    if (participant) {
      await MeetingParticipant.updateOne(
        { _id: participant._id },
        { $set: { status: 'joined', joinedAt: new Date(), leftAt: null } }
      );
    } else {
      let userDoc = null;
      if (userId) {
        userDoc = await User.findById(userId).select('name email avatar isGuest').lean();
      } else if (displayName) {
        const guestTag = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}@guest.connectx.local`;
        userDoc = await User.create({
          name: displayName.trim(),
          email: guestTag,
          isGuest: true,
        });
      }

      const isFirstParticipant = !meeting.participants || meeting.participants.length === 0;

      participant = await MeetingParticipant.create({
        meetingId,
        user: userDoc ? userDoc._id : null,
        displayName: userDoc ? userDoc.name : displayName || 'Guest Participant',
        role: isFirstParticipant ? 'host' : 'participant',
        status: 'joined',
        joinedAt: new Date(),
      });

      await Meeting.updateOne(
        { _id: meeting._id },
        { $addToSet: { participants: participant._id } }
      );
    }

    return this.getMeetingById(meetingId);
  }

  /**
   * Record a participant leaving the meeting
   */
  async leaveMeeting({ meetingId, userId, displayName }) {
    const query = { meetingId, status: 'joined' };
    if (userId) {
      query.user = userId;
    } else if (displayName) {
      query.displayName = displayName;
    }

    await MeetingParticipant.findOneAndUpdate(query, {
      $set: { status: 'left', leftAt: new Date() },
    });

    return this.getMeetingById(meetingId);
  }

  /**
   * Internal helper to end an active meeting atomically and idempotently.
   * Can be called by host explicit end API or system auto-end when last participant leaves.
   */
  async _performEndMeeting(meetingId) {
    const meeting = await Meeting.findOne({ meetingId, status: 'active' }).lean();

    if (!meeting) {
      const existing = await Meeting.findOne({ meetingId }).lean();
      if (!existing) {
        const err = new Error(`Meeting not found for ID: ${meetingId}`);
        err.statusCode = 404;
        throw err;
      }
      return this.getMeetingById(meetingId);
    }

    const endTime = new Date();
    const startTimeDate = new Date(meeting.startTime);
    const durationSeconds = Math.max(0, Math.floor((endTime.getTime() - startTimeDate.getTime()) / 1000));

    // Atomic conditional update: only update if status is STILL 'active'
    const updated = await Meeting.findOneAndUpdate(
      { meetingId, status: 'active' },
      { $set: { status: 'ended', endTime, duration: durationSeconds } },
      { returnDocument: 'after' }
    ).lean();

    if (updated) {
      await MeetingParticipant.updateMany(
        { meetingId, status: 'joined' },
        { $set: { status: 'left', leftAt: endTime } }
      );
    }

    return this.getMeetingById(meetingId);
  }

  /**
   * System auto-end meeting when last participant leaves (e.g. Socket.IO room empty)
   */
  async autoEndMeeting(meetingId) {
    try {
      return await this._performEndMeeting(meetingId);
    } catch (err) {
      return null;
    }
  }

  /**
   * Mark a meeting as ended and compute duration (Host Only)
   */
  async endMeeting(meetingId, requestingUserId = null) {
    if (!requestingUserId) {
      const err = new Error('Authentication required to end a meeting');
      err.statusCode = 401;
      throw err;
    }

    const meeting = await Meeting.findOne({ meetingId })
      .select('_id meetingId host status startTime participants')
      .lean();

    if (!meeting) {
      const err = new Error(`Meeting not found for ID: ${meetingId}`);
      err.statusCode = 404;
      throw err;
    }

    if (meeting.status === 'ended') {
      return this.getMeetingById(meetingId);
    }

    // Authorization check: Only authenticated host can end meeting
    const hostIdStr = meeting.host ? (meeting.host._id ? meeting.host._id.toString() : meeting.host.toString()) : null;
    const reqIdStr = requestingUserId ? requestingUserId.toString() : null;

    if (!hostIdStr || reqIdStr !== hostIdStr) {
      const err = new Error("Not authorized to end another user's meeting");
      err.statusCode = 403;
      throw err;
    }

    return this._performEndMeeting(meetingId);
  }

  /**
   * Get overall meeting metrics and summary for dashboard (scoped to user)
   */
  async getSummaryMetrics(userId) {
    if (!userId) {
      return {
        totalMeetings: 0,
        activeCount: 0,
        totalDurationSeconds: 0,
        recentMeetings: [],
      };
    }

    const participantDocs = await MeetingParticipant.find({ user: userId }).select('meetingId').lean();
    const participantMeetingIds = participantDocs.map((p) => p.meetingId);

    const baseQuery = {
      $or: [{ host: userId }, { meetingId: { $in: participantMeetingIds } }],
    };

    const activeQuery = {
      ...baseQuery,
      status: 'active',
    };

    const [totalMeetings, activeCount, durationResult, recentMeetings] = await Promise.all([
      Meeting.countDocuments(baseQuery),
      Meeting.countDocuments(activeQuery),
      Meeting.aggregate([
        { $match: baseQuery },
        { $group: { _id: null, totalDuration: { $sum: '$duration' } } },
      ]),
      Meeting.find(baseQuery)
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('host', 'name email avatar')
        .populate({
          path: 'participants',
          select: 'displayName role status joinedAt leftAt user',
        })
        .lean(),
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
   * List meetings for authenticated user with optional status filtering
   */
  async listMeetings({ userId, status, limit = 20, page = 1 }) {
    if (!userId) {
      return {
        meetings: [],
        pagination: {
          total: 0,
          page: 1,
          limit: Number(limit) || 20,
          totalPages: 0,
        },
      };
    }

    const participantDocs = await MeetingParticipant.find({ user: userId }).select('meetingId').lean();
    const participantMeetingIds = participantDocs.map((p) => p.meetingId);

    const query = {
      $or: [{ host: userId }, { meetingId: { $in: participantMeetingIds } }],
    };

    if (status && status !== 'all') {
      query.status = status;
    }

    const limitNum = Math.max(1, Number(limit) || 20);
    const pageNum = Math.max(1, Number(page) || 1);
    const skip = (pageNum - 1) * limitNum;

    const [meetings, total] = await Promise.all([
      Meeting.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('host', 'name email avatar')
        .populate({
          path: 'participants',
          select: 'displayName role status joinedAt leftAt user',
        })
        .lean(),
      Meeting.countDocuments(query),
    ]);

    return {
      meetings,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }
}

module.exports = new MeetingService();
