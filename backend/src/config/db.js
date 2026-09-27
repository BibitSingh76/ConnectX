const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

/**
 * Establish connection to MongoDB Atlas database
 */
const connectDB = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 5000,
    };

    const conn = await mongoose.connect(config.mongoUri, options);
    logger.info('MongoDB connected successfully');
    logger.info(`Connected Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    throw error;
  }
};

// Event Listeners for Connection Lifecycle Management
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB connection lost');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected successfully');
});

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB connection error event: ${err.message}`);
});

/**
 * Graceful disconnection procedure
 */
const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed cleanly');
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};
