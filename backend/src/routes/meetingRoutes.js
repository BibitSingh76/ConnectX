const express = require('express');
const {
  createMeeting,
  getMeeting,
  endMeeting,
  getSummary,
  getMeetings,
} = require('../controllers/meetingController');

const router = express.Router();

router.get('/summary', getSummary);

router.route('/')
  .post(createMeeting)
  .get(getMeetings);

router.route('/:id')
  .get(getMeeting);

router.route('/:id/end')
  .patch(endMeeting);

module.exports = router;
