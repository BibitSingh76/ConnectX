const logger = require('../utils/logger');
const config = require('../config');

/**
 * Secure Centralized Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`);
  if (err.stack) {
    logger.debug(err.stack);
  }

  // Hide internal database error details in production to prevent information disclosure
  const isProd = config.env === 'production';
  const clientMessage = isProd && statusCode === 500 ? 'Internal Server Error' : err.message;

  res.status(statusCode).json({
    success: false,
    error: {
      message: clientMessage || 'An unexpected error occurred',
      statusCode,
      ...(!isProd && { stack: err.stack }),
    },
  });
};

module.exports = errorHandler;
