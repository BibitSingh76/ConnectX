const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const config = require('../config');

/**
 * @desc   Get server health and database status
 * @route  GET /api/health
 * @access Public
 */
const getHealth = asyncHandler(async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const isDbConnected = dbState === 1;

  const dbStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.status(isDbConnected ? 200 : 503).json({
    success: isDbConnected,
    server: 'ok',
    database: dbStateMap[dbState] || 'unknown',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
  });
});

module.exports = {
  getHealth,
};
