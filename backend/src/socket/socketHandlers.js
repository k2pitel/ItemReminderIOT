const logger = require('../utils/logger');
const geofenceService = require('../services/geofenceService');

// Rate limiting configuration
const LOCATION_UPDATE_COOLDOWN = 4000; // 4 seconds minimum between updates
const locationUpdateLimiter = new Map();

const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    logger.info('Client connected:', socket.id);
    
    // Handle user authentication for location tracking
    socket.on('authenticate', (data) => {
      if (!data?.userId) {
        socket.emit('error', { message: 'Invalid authentication data' });
        return;
      }
      
      socket.userId = data.userId;
      socket.join(`user-${data.userId}`);
      logger.info(`User ${data.userId} authenticated on socket ${socket.id}`);
    });

    // Handle real-time location updates with rate limiting
    socket.on('location-update', async (data) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        // Rate limiting check
        const lastUpdate = locationUpdateLimiter.get(socket.userId);
        const now = Date.now();
        if (lastUpdate && (now - lastUpdate < LOCATION_UPDATE_COOLDOWN)) {
          return; // Silently ignore rapid updates
        }
        locationUpdateLimiter.set(socket.userId, now);

        const { latitude, longitude, accuracy } = data;
        
        if (!isValidLocation(latitude, longitude)) {
          socket.emit('error', { message: 'Invalid location coordinates' });
          return;
        }

        // Process location through geofence service
        const result = await geofenceService.updateUserLocation(
          socket.userId,
          { latitude, longitude, accuracy, timestamp: new Date() }
        );

        // Send geofence status back to client
        socket.emit('geofence-update', result);

        // Broadcast alerts if triggered
        if (result.alertsTriggered?.length > 0) {
          broadcastAlerts(io, socket.userId, result.alertsTriggered);
        }

        logger.info(`Location updated for user ${socket.userId}: ${latitude}, ${longitude}`);
      } catch (error) {
        logger.error('Error processing location update:', error);
        socket.emit('error', { message: 'Failed to process location update' });
      }
    });
    
    socket.on('disconnect', () => {
      logger.info('Client disconnected:', socket.id);
      
      // Clean up rate limiter entry
      if (socket.userId) {
        locationUpdateLimiter.delete(socket.userId);
      }
    });
  });
};

const isValidLocation = (latitude, longitude) => {
  return (
    typeof latitude === 'number' && 
    typeof longitude === 'number' &&
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180
  );
};

const broadcastAlerts = (io, userId, alertsTriggered) => {
  for (const alertInfo of alertsTriggered) {
    io.to(`user-${userId}`).emit('geofence-alert', {
      type: 'leave-without-items',
      message: alertInfo.alert.message,
      geofenceName: alertInfo.geofenceName,
      itemName: alertInfo.itemName,
      status: alertInfo.status,
      alert: alertInfo.alert
    });
  }
};

module.exports = { setupSocketHandlers };