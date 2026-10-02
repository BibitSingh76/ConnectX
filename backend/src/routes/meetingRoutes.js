const express = require('express');
const {
  createMeeting,
  getMeeting,
  joinMeeting,
  leaveMeeting,
  endMeeting,
  getSummary,
  getMeetings,
} = require('../controllers/meetingController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/summary', protect, getSummary);

router.route('/')
  .post(protect, createMeeting)
  .get(protect, getMeetings);

router.route('/:id')
  .get(optionalAuth, getMeeting);

router.route('/:id/join')
  .post(optionalAuth, joinMeeting);

router.route('/:id/leave')
  .post(optionalAuth, leaveMeeting);

router.route('/:id/end')
  .patch(protect, endMeeting);

module.exports = router;
