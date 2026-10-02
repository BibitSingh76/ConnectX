const { User } = require('../models');
const generateToken = require('../utils/generateToken');

class AuthService {
  /**
   * Register a new user account
   */
  async registerUser({ name, email, password }) {
    const cleanEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      const err = new Error('User with this email already exists');
      err.statusCode = 400;
      throw err;
    }

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      passwordHash: password,
      isGuest: false,
    });

    const token = generateToken(user._id);

    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      isGuest: user.isGuest,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return { user: safeUser, token };
  }

  /**
   * Authenticate an existing user
   */
  async loginUser({ email, password }) {
    const cleanEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: cleanEmail }).select('+passwordHash');
    if (!user) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    const token = generateToken(user._id);

    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      isGuest: user.isGuest,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return { user: safeUser, token };
  }

  /**
   * Get current authenticated user profile
   */
  async getCurrentUser(userId) {
    const user = await User.findById(userId)
      .select('name email avatar isGuest createdAt updatedAt')
      .lean();
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }
    return user;
  }
}

module.exports = new AuthService();
