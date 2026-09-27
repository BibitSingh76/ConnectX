const express = require('express');
const healthRoutes = require('./healthRoutes');
const meetingRoutes = require('./meetingRoutes');
const authRoutes = require('./authRoutes');

const router = express.Router();

router.use('/api', healthRoutes);
router.use('/api/auth', authRoutes);
router.use('/api/meetings', meetingRoutes);

module.exports = router;
