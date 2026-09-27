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
const { optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(optionalAuth);

router.get('/summary', getSummary);

router.route('/')
  .post(createMeeting)
  .get(getMeetings);

router.route('/:id')
  .get(getMeeting);

router.route('/:id/join')
  .post(joinMeeting);

router.route('/:id/leave')
  .post(leaveMeeting);

router.route('/:id/end')
  .patch(endMeeting);

module.exports = router;
