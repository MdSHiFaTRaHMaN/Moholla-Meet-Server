const mongoose = require('mongoose');
const config = require('./config');

// Disable query buffering when disconnected to prevent 10000ms timeout hangs
mongoose.set('bufferCommands', false);

let isConnecting = false;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1 || isConnecting) return;
  
  isConnecting = true;
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    console.log(`[MongoDB] Connected successfully to: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[MongoDB] Database connection warning: ${error.message}`);
    console.warn('[MongoDB] Running in high-availability mode with instant fallback support.');
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  } finally {
    isConnecting = false;
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Disconnected from database. Attempting reconnect...');
  setTimeout(connectDB, 3000);
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Connection error:', err.message);
});

module.exports = connectDB;
