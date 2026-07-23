const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('../config/config');

const configureSecurityMiddleware = (app) => {
  // CORS configuration
  // CORS configuration for local & live production deployments
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, serverless)
        if (!origin) return callback(null, true);
        if (
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin.endsWith('.vercel.app') ||
          (config.clientUrl && origin.startsWith(config.clientUrl))
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-demo-user', 'x-refresh-token']
    })
  );

  // Helmet for secure HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disabled for dev flexibility
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    })
  );

  // Rate Limiter
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // limit each IP to 300 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' }
  });

  app.use('/api/', apiLimiter);
};

module.exports = configureSecurityMiddleware;
