const asyncHandler = require('../utils/asyncHandler');
const { authService } = require('../services');

// Helper to validate email format
const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Helper to validate password strength
const isValidPassword = (password) => {
  // Must be at least 6 characters
  if (!password || password.length < 6) return false;
  return true;
};

/**
 * @desc   Register a new user
 * @route  POST /api/auth/register
 * @access Public
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      error: { message: 'Name is required', statusCode: 400 },
    });
  }

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Please provide a valid email address', statusCode: 400 },
    });
  }

  if (!password || !isValidPassword(password)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Password must be at least 6 characters long', statusCode: 400 },
    });
  }

  const result = await authService.registerUser({ name, email, password });

  res.status(201).json({
    success: true,
    token: result.token,
    user: result.user,
  });
});

/**
 * @desc   Authenticate user & return JWT token
 * @route  POST /api/auth/login
 * @access Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: { message: 'Please provide email and password', statusCode: 400 },
    });
  }

  const result = await authService.loginUser({ email, password });

  res.status(200).json({
    success: true,
    token: result.token,
    user: result.user,
  });
});

/**
 * @desc   Get current logged in user profile
 * @route  GET /api/auth/me
 * @access Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user._id);

  res.status(200).json({
    success: true,
    user,
  });
});

module.exports = {
  register,
  login,
  getMe,
};
