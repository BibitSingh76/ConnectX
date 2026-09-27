const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Protect routes - Verifies JWT access token
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Not authorized, no access token provided',
        statusCode: 401,
      },
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User no longer exists',
          statusCode: 401,
        },
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Not authorized, token failed or expired',
        statusCode: 401,
      },
    });
  }
});

module.exports = { protect };
