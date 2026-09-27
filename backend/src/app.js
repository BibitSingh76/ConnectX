const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const routes = require('./routes');
const notFoundHandler = require('./middleware/notFoundHandler');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// 1. Set Security HTTP Headers with Helmet
app.use(helmet());

// 2. Configure CORS properly
app.use(cors(config.cors));

// 3. Rate Limiting for Authentication API routes (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
      statusCode: 429,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 4. Rate Limiting for General API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later',
      statusCode: 429,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// 5. Parse JSON request body with 10kb size limit to prevent payload flooding DoS
app.use(express.json({ limit: '10kb' }));

// 6. Parse urlencoded request body
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 7. Data Sanitization against NoSQL Query Injection (e.g. { "$gt": "" })
app.use(mongoSanitize());

// 8. Prevent HTTP Parameter Pollution
app.use(hpp());

// 9. API routes
app.use('/', routes);

// 10. Handle 404 for unknown endpoints
app.use(notFoundHandler);

// 11. Centralized error handling
app.use(errorHandler);

module.exports = app;
