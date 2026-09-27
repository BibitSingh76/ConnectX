const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Generates a signed JWT access token for a user
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

module.exports = generateToken;
