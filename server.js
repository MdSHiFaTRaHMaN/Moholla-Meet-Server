const http = require('http');
const express = require('express');
const morgan = require('morgan');
const config = require('./config/config');
const connectDB = require('./config/db');
const configureSecurityMiddleware = require('./middleware/security');
const errorHandler = require('./middleware/errorHandler');
const { initSocket } = require('./socket/socketManager');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const projectRoutes = require('./routes/projectRoutes');
const boardRoutes = require('./routes/boardRoutes');
const taskRoutes = require('./routes/taskRoutes');
const chatRoutes = require('./routes/chatRoutes');
const documentRoutes = require('./routes/documentRoutes');
const fileRoutes = require('./routes/fileRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const aiRoutes = require('./routes/aiRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

const path = require('path');

// Security & Base Middleware
configureSecurityMiddleware(app);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Database Connection
connectDB();

// Health Check
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    app: 'CollabSpace API Server',
    version: '1.0.0',
    timestamp: new Date()
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/workspaces', workspaceRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/boards', boardRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/files', fileRoutes);
app.use('/api/v1/meetings', meetingRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// Error Handling Middleware
app.use(errorHandler);

const PORT = config.port;
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🚀 CollabSpace Backend Server live on port ${PORT}`);
    console.log(`📡 WebSocket Gateway ready via Socket.IO`);
    console.log(`=================================================`);
  });
}

module.exports = app;
