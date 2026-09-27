const asyncHandler = require('../utils/asyncHandler');
const { meetingService } = require('../services');

/**
 * @desc   Create a new meeting session
 * @route  POST /api/meetings
 * @access Public / Authenticated
 */
const createMeeting = asyncHandler(async (req, res) => {
  const { meetingId, title, hostName } = req.body;

  if (!meetingId) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'meetingId is required',
        statusCode: 400,
      },
    });
  }

  const meeting = await meetingService.createMeeting({
    meetingId,
    title,
    hostName: req.user ? req.user.name : hostName,
    hostId: req.user ? req.user._id : null,
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
 * @desc   End an active meeting session
 * @route  PATCH /api/meetings/:id/end
 * @access Public / Authenticated
 */
const endMeeting = asyncHandler(async (req, res) => {
  const meetingId = req.params.id;

  const meeting = await meetingService.endMeeting(meetingId);

  res.status(200).json({
    success: true,
    data: meeting,
  });
});

/**
 * @desc   Get dashboard summary analytics
 * @route  GET /api/meetings/summary
 * @access Public / Authenticated
 */
const getSummary = asyncHandler(async (req, res) => {
  const summary = await meetingService.getSummaryMetrics();

  res.status(200).json({
    success: true,
    data: summary,
  });
});

/**
 * @desc   List all meetings
 * @route  GET /api/meetings
 * @access Public / Authenticated
 */
const getMeetings = asyncHandler(async (req, res) => {
  const { status, limit, page } = req.query;

  const result = await meetingService.listMeetings({
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
  endMeeting,
  getSummary,
  getMeetings,
};
