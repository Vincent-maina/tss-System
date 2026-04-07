require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/database');
const logger = require('./utils/logger');
const { initializeCronJobs } = require('./config/cronJobs');

// Initialize express app
const app = express();

// Connect to database
connectDB();

// Initialize cron jobs (matching algorithm, expire old requests, etc.)
initializeCronJobs();

// Middleware
app.use(helmet()); // Security headers

// CORS configuration - handle multiple possible origins and local network IPs
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5173'
].filter(Boolean);

// Matches http://192.168.x.x:8080, http://10.x.x.x:8080, etc.
const localNetworkPattern = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+):8080$/;

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes(origin) || localNetworkPattern.test(origin);
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (uploads)
app.use('/uploads', express.static('uploads'));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// API Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Teacher School Swapping System API',
    version: process.env.API_VERSION || 'v1',
    status: 'active',
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// API version prefix
const API_PREFIX = `/api/${process.env.API_VERSION || 'v1'}`;

// Import routes
app.use(`${API_PREFIX}/auth`, require('./routes/auth'));
app.use(`${API_PREFIX}/users`, require('./routes/users'));
app.use(`${API_PREFIX}/swap-requests`, require('./routes/swapRequests'));
app.use(`${API_PREFIX}/matches`, require('./routes/matches'));
app.use(`${API_PREFIX}/messages`, require('./routes/messages'));
app.use(`${API_PREFIX}/admin`, require('./routes/admin'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
