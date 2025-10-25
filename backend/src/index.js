require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const mqttService = require('./services/mqttService');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/itemreminder', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => logger.info('MongoDB connected successfully'))
.catch(err => logger.error('MongoDB connection error:', err));

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/items', require('./routes/items'));
app.use('/api/readings', require('./routes/readings'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/geofence', require('./routes/geofence'));
app.use('/api/users', require('./routes/users'));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Socket.io connection handling
const geofenceService = require('./services/geofenceService');

io.on('connection', (socket) => {
  logger.info('Client connected:', socket.id);
  
  // Handle user authentication for location tracking
  socket.on('authenticate', (data) => {
    socket.userId = data.userId;
    socket.join(`user-${data.userId}`);
    logger.info(`User ${data.userId} authenticated on socket ${socket.id}`);
  });

  // Handle real-time location updates
  socket.on('location-update', async (data) => {
    try {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      const { latitude, longitude, accuracy } = data;
      
      if (!latitude || !longitude) {
        socket.emit('error', { message: 'Invalid location data' });
        return;
      }

      // Process location update through geofence service
      const result = await geofenceService.updateUserLocation(
        socket.userId,
        { latitude, longitude, accuracy, timestamp: new Date() }
      );

      // Send back geofence status
      socket.emit('geofence-update', result);

      // If alerts were triggered, broadcast them
      if (result.alertsTriggered && result.alertsTriggered.length > 0) {
        for (const alertInfo of result.alertsTriggered) {
          // Emit to user's room for real-time notification
          io.to(`user-${socket.userId}`).emit('geofence-alert', {
            type: 'leave-without-items',
            message: alertInfo.alert.message,
            geofenceName: alertInfo.geofenceName,
            itemName: alertInfo.itemName,
            status: alertInfo.status,
            alert: alertInfo.alert
          });
        }
      }

      logger.info(`Location updated for user ${socket.userId}: ${latitude}, ${longitude}`);
    } catch (error) {
      logger.error('Error processing location update:', error);
      socket.emit('error', { message: 'Failed to process location update' });
    }
  });
  
  socket.on('disconnect', () => {
    logger.info('Client disconnected:', socket.id);
  });
});

// Start MQTT service
mqttService.start(io);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };
