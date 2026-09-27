const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/connectx',
  jwtSecret: process.env.JWT_SECRET || 'connectx_super_secret_jwt_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cors: {
    origin: (origin, callback) => {
      // Allow server-to-server, mobile, or curl requests without origin header
      if (!origin) return callback(null, true);

      const clientUrlConfig = process.env.CLIENT_URL || 'http://localhost:3000';
      const allowedOrigins = clientUrlConfig.split(',').map((u) => u.trim());

      const isAllowed = allowedOrigins.some((allowed) => {
        if (allowed === '*' || allowed === origin) return true;
        if (allowed.includes('vercel.app') && origin.endsWith('.vercel.app')) return true;
        return false;
      });

      if (isAllowed || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy blocked access from origin: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
};
