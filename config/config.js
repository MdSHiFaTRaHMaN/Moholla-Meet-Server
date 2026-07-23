const dotenv = require('dotenv');
const path = require('path');

// Explicitly load .env file from server root directory
dotenv.config({ path: path.join(__dirname, '../.env') });

module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/collabspace',
  jwtSecret: process.env.JWT_SECRET || 'collabspace_super_secret_jwt_key_2026_e8d9f1a2',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'collabspace_super_secret_refresh_jwt_key_2026_x7y8z9a0',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000'
};
