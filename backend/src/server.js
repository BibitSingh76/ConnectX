const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const config = require('./config');
const { connectDB, disconnectDB } = require('./config/db');
const logger = require('./utils/logger');
const { initSocket } = require('./socket');

const server = http.createServer(app);
const io = new Server(server, {
  cors: config.cors,
});

initSocket(io);

const PORT = config.port;

/**
 * Start Server with Database Connection
 */
const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      logger.info(`Server listening on port ${PORT} in [${config.env}] mode`);
      logger.info(`Health check available at: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    logger.error(`Fatal: Server startup aborted due to MongoDB connection failure: ${error.message}`);
    process.exit(1);
  }
};

startServer();

/**
 * Graceful server shutdown procedure
 */
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Initiating graceful shutdown...`);
  
  try {
    await disconnectDB();
  } catch (err) {
    logger.error('Error during database disconnection:', err.message);
  }

  server.close(() => {
    logger.info('HTTP server closed. Exiting process.');
    process.exit(0);
  });

  // Force shutdown if connections do not close in 10s
  setTimeout(() => {
    logger.error('Could not close connections in time, forcing exit.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception thrown:', err.message || err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  gracefulShutdown('unhandledRejection');
});

module.exports = server;
