const setupSignaling = require('./signaling');

const initSocket = (io) => {
  setupSignaling(io);
  return io;
};

module.exports = { initSocket };
