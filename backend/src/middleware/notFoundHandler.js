/**
 * Handles requests to endpoints that do not exist (404)
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Resource not found - ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: {
      message: error.message,
      statusCode: 404,
    },
  });
};

module.exports = notFoundHandler;
