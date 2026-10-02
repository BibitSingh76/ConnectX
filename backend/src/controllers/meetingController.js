const asyncHandler = require('../utils/asyncHandler');
const { meetingService } = require('../services');

/**
 * @desc   Create a new meeting session
 * @route  POST /api/meetings
 * @access Public / Authenticated
 */
const createMeeting = asyncHandler(async (req, res) => {
  const { meetingId, title } = req.body;

  if (!meetingId) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'meetingId is required',
        statusCode: 400,
      },
    });
  }

  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required to create a meeting',
        statusCode: 401,
      },
    });
  }

  const meeting = await meetingService.createMeeting({
    meetingId,
    title,
    hostId: req.user._id,
    hostName: req.user.name,
  });

  res.status(201).json({
    success: true,
    data: meeting,
  });
});

/**
 * @desc   Get meeting details by meetingId
 * @route  GET /api/meetings/:id
 * @access Public
 */
const getMeeting = asyncHandler(async (req, res) => {
  const meetingId = req.params.id;

  const meeting = await meetingService.getMeetingById(meetingId);

  res.status(200).json({
    success: true,
    data: meeting,
  });
});

/**
 * @desc   Record joining an active meeting
 * @route  POST /api/meetings/:id/join
 * @access Public / Authenticated
 */
const joinMeeting = asyncHandler(async (req, res) => {
  const meetingId = req.params.id;
  const { displayName } = req.body;

  const meeting = await meetingService.joinMeeting({
    meetingId,
    userId: req.user ? req.user._id : null,
    displayName: req.user ? req.user.name : displayName,
  });

  res.status(200).json({
    success: true,
    data: meeting,
  });
});

/**
 * @desc   Record leaving an active meeting
 * @route  POST /api/meetings/:id/leave
 * @access Public / Authenticated
 */
const leaveMeeting = asyncHandler(async (req, res) => {
  const meetingId = req.params.id;
  const { displayName } = req.body;

  const meeting = await meetingService.leaveMeeting({
    meetingId,
    userId: req.user ? req.user._id : null,
    displayName: req.user ? req.user.name : displayName,
  });

  res.status(200).json({
    success: true,
    data: meeting,
  });
});

/**
 * @desc   End an active meeting session
 * @route  PATCH /api/meetings/:id/end
 * @access Authenticated (Host Only)
 */
const endMeeting = asyncHandler(async (req, res) => {
  const meetingId = req.params.id;

  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required to end a meeting',
        statusCode: 401,
      },
    });
  }

  const meeting = await meetingService.endMeeting(meetingId, req.user._id);

  res.status(200).json({
    success: true,
    data: meeting,
  });
});

/**
 * @desc   Get dashboard summary analytics
 * @route  GET /api/meetings/summary
 * @access Authenticated
 */
const getSummary = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required',
        statusCode: 401,
      },
    });
  }

  const summary = await meetingService.getSummaryMetrics(req.user._id);

  res.status(200).json({
    success: true,
    data: summary,
  });
});

/**
 * @desc   List meetings for authenticated user
 * @route  GET /api/meetings
 * @access Authenticated
 */
const getMeetings = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required',
        statusCode: 401,
      },
    });
  }

  const { status, limit, page } = req.query;

  const result = await meetingService.listMeetings({
    userId: req.user._id,
    status,
    limit,
    page,
  });

  res.status(200).json({
    success: true,
    ...result,
  });
});

module.exports = {
  createMeeting,
  getMeeting,
  joinMeeting,
  leaveMeeting,
  endMeeting,
  getSummary,
  getMeetings,
};
