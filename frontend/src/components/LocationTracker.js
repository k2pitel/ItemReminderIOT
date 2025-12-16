import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Switch, 
  FormControlLabel, 
  Chip, 
  Box,
  Alert
} from '@mui/material';
import { LocationOn, Warning } from '@mui/icons-material';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

// Configuration constants
const LOCATION_CONFIG = {
  MAX_JUMP_DISTANCE: 5000, // Increased for better mobility
  MIN_ACCURACY: 1000, // More lenient accuracy for unstable GPS
  UPDATE_COOLDOWN: 3000, // Slightly longer for network stability
  BUFFER_SIZE: 1, // No buffering to reduce lag on unstable network
  GPS_TIMEOUT: 5000 // Shorter timeout for unstable network
};

const LocationTracker = () => {
  const { socket } = useSocket();
  const { user } = useAuth();
  
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [geofenceStatus, setGeofenceStatus] = useState([]);
  const [error, setError] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  const watchIdRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const locationBufferRef = useRef([]);

  // Socket authentication and event handlers
  useEffect(() => {
    if (!socket || !user) {
      console.log('Socket or user not available:', { socket: !!socket, user: !!user });
      return;
    }

    console.log('Authenticating socket for user:', user.id);
    socket.emit('authenticate', { userId: user.id });

    const handleGeofenceUpdate = (data) => {
      console.log('Received geofence update:', data);
      setGeofenceStatus(data.geofenceStatus || []);
    };

    const handleGeofenceAlert = (alert) => {
      console.log('Received geofence alert:', alert);
      if (Notification.permission === 'granted') {
        new Notification(alert.message, {
          icon: '/favicon.ico',
          tag: `geofence-${alert.geofenceName}`
        });
      }
    };

    socket.on('geofence-update', handleGeofenceUpdate);
    socket.on('geofence-alert', handleGeofenceAlert);

    return () => {
      socket.off('geofence-update', handleGeofenceUpdate);
      socket.off('geofence-alert', handleGeofenceAlert);
    };
  }, [socket, user]);

  const isValidLocation = (lat, lon, acc) => {
    return (
      typeof lat === 'number' && typeof lon === 'number' &&
      lat >= -90 && lat <= 90 &&
      lon >= -180 && lon <= 180 &&
      acc <= LOCATION_CONFIG.MIN_ACCURACY
    );
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
             Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const smoothLocation = (lat, lon, acc) => {
    const buffer = locationBufferRef.current;
    
    // Add to buffer
    buffer.push({ lat, lon, acc });
    if (buffer.length > LOCATION_CONFIG.BUFFER_SIZE) {
      buffer.shift();
    }

    // Return average for smoothing
    const avgLat = buffer.reduce((sum, loc) => sum + loc.lat, 0) / buffer.length;
    const avgLon = buffer.reduce((sum, loc) => sum + loc.lon, 0) / buffer.length;
    const bestAcc = Math.min(...buffer.map(loc => loc.acc));

    return { lat: avgLat, lon: avgLon, acc: bestAcc };
  };

  const sendLocationUpdate = useCallback((lat, lon, acc) => {
    if (!socket || !socket.connected) {
      console.warn('Socket not connected, queuing location update');
      return;
    }
    
    const now = Date.now();
    if (now - lastUpdateRef.current < LOCATION_CONFIG.UPDATE_COOLDOWN) {
      console.log('Location update rate limited, skipping');
      return;
    }

    try {
      console.log('Sending location update:', { latitude: lat, longitude: lon, accuracy: acc });
      socket.emit('location-update', { latitude: lat, longitude: lon, accuracy: acc });
      lastUpdateRef.current = now;
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to send location update:', error);
      setError('Network error sending location');
    }
  }, [socket]);

  const handleLocationUpdate = useCallback((position) => {
    const { latitude: lat, longitude: lon, accuracy: acc } = position.coords;

    console.log('Received GPS position:', { lat, lon, acc });

    if (!isValidLocation(lat, lon, acc)) {
      const errorMsg = `Invalid location (accuracy: ${(acc/1000).toFixed(1)}km)`;
      console.warn(errorMsg);
      setError(errorMsg);
      return;
    }

    // Check for unrealistic jumps
    if (currentLocation) {
      const distance = calculateDistance(currentLocation.lat, currentLocation.lon, lat, lon);
      if (distance > LOCATION_CONFIG.MAX_JUMP_DISTANCE) {
        const errorMsg = `Location jump too large: ${(distance/1000).toFixed(1)}km`;
        console.warn(errorMsg);
        setError(errorMsg);
        return;
      }
    }

    const smoothed = smoothLocation(lat, lon, acc);
    console.log('Smoothed location:', smoothed);
    
    setCurrentLocation(smoothed);
    setAccuracy(smoothed.acc);
    setError(null);

    sendLocationUpdate(smoothed.lat, smoothed.lon, smoothed.acc);
  }, [currentLocation, sendLocationUpdate]);

  const handleLocationError = useCallback((error) => {
    let message;
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = "Location access denied. Please enable location permissions.";
        break;
      case error.POSITION_UNAVAILABLE:
        message = "Location unavailable. Check GPS/network connection.";
        break;
      case error.TIMEOUT:
        message = "Location timeout. Poor network/GPS signal.";
        break;
      default:
        message = "Location error. Check network connection.";
        break;
    }
    console.error('Location error:', error, message);
    setError(message);
    
    // Auto-retry on timeout for unstable networks
    if (error.code === error.TIMEOUT && isTracking) {
      setTimeout(() => {
        console.log('Retrying location after timeout...');
        setError(null);
      }, 3000);
    }
  }, [isTracking]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser');
      return;
    }

    console.log('Starting location tracking...');

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const options = {
      enableHighAccuracy: false, // Use less accurate but more stable positioning
      timeout: LOCATION_CONFIG.GPS_TIMEOUT,
      maximumAge: 30000 // Longer cache to handle network drops
    };

    console.log('Starting geolocation watch with options:', options);

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleLocationUpdate,
      handleLocationError,
      options
    );

    setIsTracking(true);
    console.log('Location tracking started, watch ID:', watchIdRef.current);
  }, [handleLocationUpdate, handleLocationError]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    setCurrentLocation(null);
    setAccuracy(null);
    setError(null);
    locationBufferRef.current = [];
  }, []);

  const toggleTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  const formatAccuracy = (acc) => {
    if (!acc) return 'Unknown';
    return acc < 1000 ? `${Math.round(acc)}m` : `${(acc/1000).toFixed(1)}km`;
  };

  const getStatusColor = (status) => {
    const colors = {
      'INSIDE': 'success',
      'OUTSIDE': 'warning',
      'UNKNOWN': 'default'
    };
    return colors[status] || 'default';
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <LocationOn sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">Location Tracking</Typography>
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={isTracking}
              onChange={toggleTracking}
              color="primary"
            />
          }
          label={isTracking ? "Tracking Active" : "Start Tracking"}
          sx={{ mb: 2 }}
        />

        {error && (
          <Alert severity="warning" sx={{ mb: 2 }} icon={<Warning />}>
            {error}
          </Alert>
        )}

        {currentLocation && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Current Location:</strong><br/>
              Lat: {currentLocation.lat.toFixed(6)}<br/>
              Lon: {currentLocation.lon.toFixed(6)}<br/>
              Accuracy: {formatAccuracy(accuracy)}
            </Typography>
            {lastUpdate && (
              <Typography variant="caption" color="text.secondary">
                Last update: {lastUpdate.toLocaleTimeString()}
              </Typography>
            )}
          </Box>
        )}

        {geofenceStatus.length > 0 && (
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Geofence Status:</strong>
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {geofenceStatus.map((status, index) => (
                <Chip
                  key={index}
                  label={`${status.geofenceName}: ${status.status}`}
                  color={getStatusColor(status.status)}
                  size="small"
                />
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default LocationTracker;