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
  const [lastLocationUpdate, setLastLocationUpdate] = useState(null);
  const [lastGeofenceUpdate, setLastGeofenceUpdate] = useState(null);
  const [previousLocation, setPreviousLocation] = useState(null);
  const [locationBuffer, setLocationBuffer] = useState([]);
  const lastBackendUpdateRef = React.useRef(0);

  useEffect(() => {
    if (!socket || !user) {
      console.log('LocationTracker: Missing socket or user', { socket: !!socket, user: !!user });
      return;
    }

    console.log('LocationTracker: Authenticating socket for user', user.id);
    // Authenticate socket for location tracking
    socket.emit('authenticate', { userId: user.id });

    // Listen for geofence updates
    socket.on('geofence-update', (data) => {
      setGeofenceStatus(data.geofenceStatus || []);
      setLastGeofenceUpdate(new Date());
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

  // Calculate distance between two coordinates in meters (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Validate and smooth location updates to filter out erratic jumps
  const processLocationUpdate = (newLat, newLon, newAccuracy) => {
    const MAX_JUMP_DISTANCE = 500; // Maximum realistic movement in meters between updates
    const MIN_ACCURACY = 500; // Accept locations with accuracy up to 500m (laptop WiFi location)
    const BUFFER_SIZE = 3; // Keep last 3 readings for smoothing
    
    // Reject very inaccurate readings
    if (newAccuracy > MIN_ACCURACY) {
      console.log(`LocationTracker: Rejecting inaccurate location (accuracy: ${newAccuracy}m)`);
      return null;
    }

    // If we have a previous location, check if the jump is realistic
    if (previousLocation) {
      const distance = calculateDistance(
        previousLocation.latitude,
        previousLocation.longitude,
        newLat,
        newLon
      );

      // If the jump is too large and the accuracy is poor, it's likely a glitch
      if (distance > MAX_JUMP_DISTANCE && newAccuracy > 30) {
        console.log(`LocationTracker: Rejecting suspicious jump of ${distance.toFixed(0)}m with accuracy ${newAccuracy.toFixed(0)}m`);
        return null;
      }

      // If jump is large but accuracy is good, it might be legitimate (e.g., user is in a car)
      if (distance > MAX_JUMP_DISTANCE && newAccuracy <= 30) {
        console.log(`LocationTracker: Accepting large jump of ${distance.toFixed(0)}m due to good accuracy (${newAccuracy.toFixed(0)}m)`);
      }
    }

    // Add to buffer for moving average (helps smooth out small jitters)
    const newBuffer = [...locationBuffer, { latitude: newLat, longitude: newLon, accuracy: newAccuracy }];
    if (newBuffer.length > BUFFER_SIZE) {
      newBuffer.shift();
    }
    setLocationBuffer(newBuffer);

    // Calculate weighted average (more weight to more accurate readings)
    let totalWeight = 0;
    let weightedLat = 0;
    let weightedLon = 0;

    newBuffer.forEach(loc => {
      const weight = 1 / (loc.accuracy + 1); // Lower accuracy = lower weight
      totalWeight += weight;
      weightedLat += loc.latitude * weight;
      weightedLon += loc.longitude * weight;
    });

    const smoothedLat = weightedLat / totalWeight;
    const smoothedLon = weightedLon / totalWeight;

    setPreviousLocation({ latitude: newLat, longitude: newLon });

    return {
      latitude: smoothedLat,
      longitude: smoothedLon,
      accuracy: newAccuracy
    };
  };

  const startTracking = async () => {
    console.log('LocationTracker: Starting tracking...');
    
    if (!navigator.geolocation) {
      console.error('LocationTracker: Geolocation not supported');
      setError('Geolocation is not supported by this browser');
      return;
    }

    // Request notification permission
    if (Notification.permission === 'default') {
      console.log('LocationTracker: Requesting notification permission...');
      await Notification.requestPermission();
    }

    console.log('LocationTracker: Socket connected?', !!socket);
    setError(null);
    setIsTracking(true);

    // Optimized geolocation options - use GPS for high accuracy
    const options = {
      enableHighAccuracy: true, // Use GPS for high accuracy
      timeout: 15000, // 15 seconds timeout
      maximumAge: 5000 // Allow cached positions up to 5 seconds old
    };

    console.log('LocationTracker: Starting location tracking with network-based positioning');

    const BACKEND_UPDATE_INTERVAL = 5000; // Send to backend every 5 seconds max

    // Try to get initial position immediately
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log('LocationTracker: Got initial location', { latitude, longitude, accuracy });
        
        // For initial position, always accept it (no previous location to compare)
        setCurrentLocation({ latitude, longitude });
        setPreviousLocation({ latitude, longitude });
        setLocationBuffer([{ latitude, longitude, accuracy }]);
        setAccuracy(accuracy);
        setError(null);
        setLastLocationUpdate(new Date());
        
        if (socket) {
          socket.emit('location-update', {
            latitude,
            longitude,
            accuracy,
            timestamp: new Date().toISOString()
          });
          lastBackendUpdateRef.current = Date.now();
        }
      },
      (error) => {
        console.warn('LocationTracker: Could not get initial position', error);
        setError('Getting initial location...');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 } // Quick initial fix with GPS
    );

    // Start continuous tracking
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        console.log('LocationTracker: Raw location update', { latitude, longitude, accuracy });
        
        // Process and validate the location update
        const processedLocation = processLocationUpdate(latitude, longitude, accuracy);
        
        if (!processedLocation) {
          console.log('LocationTracker: Location update rejected by filter');
          return; // Skip this update
        }
        
        console.log('LocationTracker: Smoothed location', processedLocation);
        setCurrentLocation({ 
          latitude: processedLocation.latitude, 
          longitude: processedLocation.longitude 
        });
        setAccuracy(processedLocation.accuracy);
        setError(null); // Clear any previous errors
        setLastLocationUpdate(new Date());
        
        // Send location to backend with debouncing
        const now = Date.now();
        if (socket && (now - lastBackendUpdateRef.current >= BACKEND_UPDATE_INTERVAL)) {
          console.log('LocationTracker: Sending location to backend');
          socket.emit('location-update', {
            latitude: processedLocation.latitude,
            longitude: processedLocation.longitude,
            accuracy: processedLocation.accuracy,
            timestamp: new Date().toISOString()
          });
          lastBackendUpdateRef.current = now;
        } else if (!socket) {
          console.warn('LocationTracker: No socket connection to send location');
        } else {
          console.log(`LocationTracker: Debouncing - ${Math.ceil((BACKEND_UPDATE_INTERVAL - (now - lastBackendUpdateRef.current)) / 1000)}s until next update`);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        
        // Don't stop tracking on timeout - just show a message
        if (error.code === 3) { // TIMEOUT
          console.log('LocationTracker: Timeout, but continuing to try...');
          setError('Location services are slow to respond. Continuing to try...');
        } else if (error.code === 1) { // PERMISSION_DENIED
          setError('Location permission denied. Please enable location access in your browser.');
          setIsTracking(false);
        } else if (error.code === 2) { // POSITION_UNAVAILABLE
          setError('Location unavailable. Check your device\'s location settings.');
        } else {
          setError(`Location error: ${error.message}`);
        }
      },
      options
    );

    setWatchId(id);
    console.log('LocationTracker: Watch started with ID:', id);
  };

  const stopTracking = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
    setCurrentLocation(null);
    setGeofenceStatus([]);
    setPreviousLocation(null);
    setLocationBuffer([]);
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
          <Box display="flex" alignItems="center">
            <LocationIcon sx={{ color: 'text.secondary', mr: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Location Tracking
            </Typography>
          </Box>
          
          <FormControlLabel
            control={
              <Switch
                checked={isTracking}
                onChange={handleToggleTracking}
                size="small"
              />
            }
            label={
              <Typography variant="caption" color="text.secondary">
                {isTracking ? 'Active' : 'Off'}
              </Typography>
            }
          />
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 2,
              borderRadius: 2
            }}
          >
            {error}
          </Alert>
        )}

        {isTracking && !currentLocation && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Acquiring location...
            </Typography>
            <LinearProgress sx={{ height: 2 }} />
          </Box>
        )}

        {currentLocation && (
          <>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Coordinates
                </Typography>
                {accuracy && (
                  <Chip
                    label={`±${Math.round(accuracy)}m`}
                    color={getAccuracyColor(accuracy)}
                    size="small"
                  />
                )}
              </Box>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </Typography>
            </Box>

            {geofenceStatus.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Geofences
                </Typography>
                {geofenceStatus.map((geofence) => (
                  <Box key={geofence.id} sx={{ mb: 0.5 }}>
                    <Chip
                      icon={geofence.isInside ? <LocationIcon /> : <WarningIcon />}
                      label={`${geofence.name}: ${
                        geofence.isInside 
                          ? 'Inside' 
                          : formatDistance(geofence.distance)
                      }`}
                      color={geofence.isInside ? 'success' : 'default'}
                      variant={geofence.isInside ? 'filled' : 'outlined'}
                      size="small"
                    />
                  </Box>
                ))}
              </Box>
            )}

            <Box sx={{ pt: 2, borderTop: '1px solid #e5e7eb' }}>
              {lastLocationUpdate && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                  Updated: {lastLocationUpdate.toLocaleTimeString()}
                </Typography>
              )}
              {lastGeofenceUpdate && (
                <Typography variant="caption" color="text.secondary" display="block">
                  Checked: {lastGeofenceUpdate.toLocaleTimeString()}
                </Typography>
              )}
            </Box>
          </>
        )}

        {!isTracking && (
          <Typography variant="caption" color="text.secondary">
            Enable tracking to monitor geofence alerts
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default LocationTracker;