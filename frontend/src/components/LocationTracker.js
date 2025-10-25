import React, { useEffect, useState } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Switch, 
  FormControlLabel, 
  Chip, 
  Box,
  Alert,
  LinearProgress
} from '@mui/material';
import { 
  LocationOn as LocationIcon, 
  GpsFixed as GpsIcon,
  Warning as WarningIcon 
} from '@mui/icons-material';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const LocationTracker = () => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [geofenceStatus, setGeofenceStatus] = useState([]);
  const [watchId, setWatchId] = useState(null);
  const [error, setError] = useState(null);
  const [accuracy, setAccuracy] = useState(null);

  useEffect(() => {
    if (!socket || !user) return;

    // Authenticate socket for location tracking
    socket.emit('authenticate', { userId: user.id });

    // Listen for geofence updates
    socket.on('geofence-update', (data) => {
      setGeofenceStatus(data.geofenceStatus);
    });

    // Listen for geofence alerts
    socket.on('geofence-alert', (alert) => {
      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(alert.message, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: `geofence-${alert.geofenceName}`
        });
      }
      
      // You can add custom alert handling here (toast notifications, etc.)
      console.log('🚨 Geofence Alert:', alert);
    });

    return () => {
      socket.off('geofence-update');
      socket.off('geofence-alert');
    };
  }, [socket, user]);

  const startTracking = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    // Request notification permission
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    setError(null);
    setIsTracking(true);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000 // Cache for 5 seconds
    };

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        setCurrentLocation({ latitude, longitude });
        setAccuracy(accuracy);
        
        // Send location to backend
        if (socket) {
          socket.emit('location-update', {
            latitude,
            longitude,
            accuracy,
            timestamp: new Date().toISOString()
          });
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError(`Location error: ${error.message}`);
        setIsTracking(false);
      },
      options
    );

    setWatchId(id);
  };

  const stopTracking = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
    setCurrentLocation(null);
    setGeofenceStatus([]);
    setAccuracy(null);
    setError(null);
  };

  const handleToggleTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  const getAccuracyColor = (accuracy) => {
    if (accuracy < 10) return 'success';
    if (accuracy < 50) return 'warning';
    return 'error';
  };

  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6" component="div">
            <LocationIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            GPS Tracking
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={isTracking}
                onChange={handleToggleTracking}
                color="primary"
              />
            }
            label={isTracking ? 'Tracking' : 'Disabled'}
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {isTracking && !currentLocation && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Getting GPS location...
            </Typography>
            <LinearProgress />
          </Box>
        )}

        {currentLocation && (
          <>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Current Location:
              </Typography>
              <Typography variant="body1">
                <GpsIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </Typography>
              
              {accuracy && (
                <Chip
                  label={`Accuracy: ±${Math.round(accuracy)}m`}
                  color={getAccuracyColor(accuracy)}
                  size="small"
                  sx={{ mt: 1 }}
                />
              )}
            </Box>

            {geofenceStatus.length > 0 && (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Geofence Status:
                </Typography>
                {geofenceStatus.map((geofence) => (
                  <Box key={geofence.id} sx={{ mb: 1 }}>
                    <Chip
                      icon={geofence.isInside ? <LocationIcon /> : <WarningIcon />}
                      label={`${geofence.name}: ${
                        geofence.isInside 
                          ? 'Inside' 
                          : `${formatDistance(geofence.distance)} away`
                      }`}
                      color={geofence.isInside ? 'success' : 'default'}
                      variant={geofence.isInside ? 'filled' : 'outlined'}
                      size="small"
                    />
                  </Box>
                ))}
              </Box>
            )}
          </>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          💡 Smart alerts will notify you if you leave an area while essential items are low
        </Typography>
      </CardContent>
    </Card>
  );
};

export default LocationTracker;