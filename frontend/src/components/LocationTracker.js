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
    const MAX_JUMP_DISTANCE = 1000; // Increased for more realistic movement detection
    const MIN_ACCURACY_GPS = 50; // Tight requirement for GPS readings
    const MIN_ACCURACY_NETWORK = 1000; // More lenient for network when GPS unavailable
    const BUFFER_SIZE = 5; // More readings for better smoothing
    
    // Reject extremely inaccurate readings (like 146km accuracy)
    if (newAccuracy > 50000) { // 50km is clearly unusable
      console.log(`LocationTracker: Rejecting extremely inaccurate location (accuracy: ${(newAccuracy/1000).toFixed(1)}km)`);
      return null;
    }
    
    // For high accuracy readings, be strict
    if (newAccuracy > MIN_ACCURACY_GPS) {
      // If we're getting network-level accuracy, still try to use it but warn user
      if (newAccuracy < MIN_ACCURACY_NETWORK) {
        console.log(`LocationTracker: Using network-based location (accuracy: ${newAccuracy.toFixed(0)}m) - consider moving outdoors for GPS`);
        // Don't reject, but mark as network positioning
      } else {
        console.log(`LocationTracker: Rejecting inaccurate location (accuracy: ${newAccuracy.toFixed(0)}m > ${MIN_ACCURACY_NETWORK}m threshold)`);
        return null;
      }
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
      if (distance > MAX_JUMP_DISTANCE && newAccuracy > 20) {
        console.log(`LocationTracker: Rejecting suspicious jump of ${distance.toFixed(0)}m with accuracy ${newAccuracy.toFixed(0)}m`);
        return null;
      }

      // If jump is large but accuracy is good, it might be legitimate (e.g., user is in a car)
      if (distance > MAX_JUMP_DISTANCE && newAccuracy <= 20) {
        console.log(`LocationTracker: Accepting large jump of ${distance.toFixed(0)}m due to good accuracy (${newAccuracy.toFixed(0)}m)`);
      }
      
      // For moderate jumps, check if accuracy is improving
      if (distance > 200 && distance <= MAX_JUMP_DISTANCE) {
        console.log(`LocationTracker: Moderate movement of ${distance.toFixed(0)}m detected with ${newAccuracy.toFixed(0)}m accuracy`);
      }
    }

    // Add to buffer for moving average (helps smooth out small jitters)
    const newBuffer = [...locationBuffer, { latitude: newLat, longitude: newLon, accuracy: newAccuracy }];
    if (newBuffer.length > BUFFER_SIZE) {
      newBuffer.shift();
    }
    setLocationBuffer(newBuffer);

    // Improved weighted average - less aggressive smoothing for better responsiveness
    let totalWeight = 0;
    let weightedLat = 0;
    let weightedLon = 0;

    // Give much more weight to recent readings and high accuracy
    newBuffer.forEach((loc, index) => {
      const recencyWeight = (index + 1) / newBuffer.length; // More weight to recent readings
      const accuracyWeight = Math.min(50, 1 / (loc.accuracy + 1)); // Cap accuracy weight to prevent over-weighting
      const combinedWeight = recencyWeight * accuracyWeight * 10; // Scale up for better precision
      
      totalWeight += combinedWeight;
      weightedLat += loc.latitude * combinedWeight;
      weightedLon += loc.longitude * combinedWeight;
    });

    const smoothedLat = weightedLat / totalWeight;
    const smoothedLon = weightedLon / totalWeight;

    // Debug logging to help diagnose accuracy issues
    const smoothingOffset = calculateDistance(newLat, newLon, smoothedLat, smoothedLon);
    console.log(`LocationTracker: Raw: ${newLat.toFixed(6)}, ${newLon.toFixed(6)} (${newAccuracy.toFixed(1)}m) → Smoothed: ${smoothedLat.toFixed(6)}, ${smoothedLon.toFixed(6)} (offset: ${smoothingOffset.toFixed(1)}m)`);

    setPreviousLocation({ latitude: newLat, longitude: newLon });

    return {
      latitude: smoothedLat,
      longitude: smoothedLon,
      accuracy: newAccuracy
    };
  };

  const startTracking = async () => {
    console.log('LocationTracker: Starting tracking...');
    console.log('LocationTracker: Geolocation support:', !!navigator.geolocation);
    console.log('LocationTracker: User available:', !!user);
    console.log('LocationTracker: Socket available:', !!socket);
    
    if (!navigator.geolocation) {
      console.error('LocationTracker: Geolocation not supported');
      setError('Geolocation is not supported by this browser');
      return;
    }

    // Check current permission state
    if (navigator.permissions) {
      try {
        const permissionStatus = await navigator.permissions.query({name: 'geolocation'});
        console.log('LocationTracker: Current geolocation permission:', permissionStatus.state);
        if (permissionStatus.state === 'denied') {
          setError('Location access is blocked. Please enable location permissions in your browser settings.');
          return;
        }
      } catch (e) {
        console.log('LocationTracker: Could not check permission status:', e);
      }
    }

    // Request notification permission
    if (Notification.permission === 'default') {
      console.log('LocationTracker: Requesting notification permission...');
      const notificationPermission = await Notification.requestPermission();
      console.log('LocationTracker: Notification permission result:', notificationPermission);
    }

    console.log('LocationTracker: Socket connected?', !!socket);
    setError(null);
    setIsTracking(true);

    console.log('LocationTracker: Starting location tracking with enhanced GPS strategy');

    const BACKEND_UPDATE_INTERVAL = 5000; // Send to backend every 5 seconds max

    // Enhanced strategy: Multiple GPS attempts with different configurations
    const tryInitialPosition = async () => {
      // Ultra-high accuracy attempt (for outdoor use)
      const ultraHighAccuracyOptions = {
        enableHighAccuracy: true,
        timeout: 15000, // Longer timeout for GPS lock
        maximumAge: 0 // Force fresh position
      };

      // High accuracy attempt
      const highAccuracyOptions = {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 5000
      };

      // Network positioning fallback
      const networkOptions = {
        enableHighAccuracy: false,
        timeout: 20000, 
        maximumAge: 30000
      };

      // Try ultra-high accuracy first (for when outdoors with clear sky)
      console.log('LocationTracker: Attempting ultra-high accuracy GPS...');
      try {
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude, accuracy } = position.coords;
              console.log('LocationTracker: Got ultra-high-accuracy initial location', { latitude, longitude, accuracy });
              
              if (accuracy > 100) {
                console.log('LocationTracker: Ultra-high accuracy too poor, will try fallback');
                reject(new Error(`Accuracy too poor: ${accuracy}m`));
                return;
              }
              
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
              resolve();
            },
            reject,
            ultraHighAccuracyOptions
          );
        });
        console.log('LocationTracker: Ultra-high-accuracy positioning successful');
        return true;
      } catch (error) {
        console.warn('LocationTracker: Ultra-high-accuracy failed:', error.message, 'trying standard GPS...');
        setError('Trying GPS positioning...');
      }
      
      // Second try: Standard high accuracy GPS
      console.log('LocationTracker: Attempting standard GPS...');
      try {
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude, accuracy } = position.coords;
              console.log('LocationTracker: Got high-accuracy initial location', { latitude, longitude, accuracy });
              
              setCurrentLocation({ latitude, longitude });
              setPreviousLocation({ latitude, longitude });
              setLocationBuffer([{ latitude, longitude, accuracy }]);
              setAccuracy(accuracy);
              setError('GPS positioning active');
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
              resolve();
            },
            reject,
            highAccuracyOptions
          );
        });
        console.log('LocationTracker: High-accuracy positioning successful');
        return true;
      } catch (error) {
        console.warn('LocationTracker: High-accuracy failed:', error.message, 'trying network positioning...');
        setError('GPS failed, trying network positioning...');
        
        // Third try: Network-based positioning
        console.log('LocationTracker: Attempting network positioning...');
        try {
          await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                console.log('LocationTracker: Got network-based initial location', { latitude, longitude, accuracy });
                
                setCurrentLocation({ latitude, longitude });
                setPreviousLocation({ latitude, longitude });
                setLocationBuffer([{ latitude, longitude, accuracy }]);
                setAccuracy(accuracy);
                setError('Using network positioning (less accurate)');
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
                resolve();
              },
              reject,
              networkOptions
            );
          });
          console.log('LocationTracker: Network positioning successful');
          return true;
        } catch (networkError) {
          console.error('LocationTracker: All positioning methods failed:', networkError.message);
          setError('Location access failed. Please: 1) Enable location permissions, 2) Check device GPS/location settings, 3) Try refreshing the page.');
          setIsTracking(false);
          return false;
        }
      }
    };

    // Try to get initial position
    const initialSuccess = await tryInitialPosition();

    // Only start continuous tracking if we got initial position
    if (!initialSuccess) {
      setIsTracking(false);
      return;
    }

    // Optimized tracking options for better GPS accuracy
    const trackingOptions = {
      enableHighAccuracy: true,
      timeout: 25000, // Longer timeout for stable GPS lock
      maximumAge: 5000 // Fresher positions for better accuracy
    };

    // Start continuous tracking with retry logic
    const startContinuousTracking = () => {
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
          console.error('Geolocation continuous tracking error:', error);
          
          // Handle different error types with appropriate responses
          if (error.code === 3) { // TIMEOUT
            console.log('LocationTracker: Continuous tracking timeout, will retry...');
            setError('Location update delayed. Retrying...');
            // Don't stop tracking, just show temporary error
          } else if (error.code === 1) { // PERMISSION_DENIED
            setError('Location permission was revoked. Please re-enable location access.');
            setIsTracking(false);
          } else if (error.code === 2) { // POSITION_UNAVAILABLE
            console.log('LocationTracker: Position unavailable, using fallback...');
            setError('GPS unavailable. Trying network positioning...');
            // Try to restart with network-only positioning
            setTimeout(() => {
              if (isTracking) { // Only restart if still supposed to be tracking
                console.log('LocationTracker: Restarting with network positioning fallback');
                navigator.geolocation.clearWatch(id);
                startNetworkFallbackTracking();
              }
            }, 3000);
          } else {
            setError(`Location error: ${error.message}`);
          }
        },
        trackingOptions
      );

      setWatchId(id);
      console.log('LocationTracker: Continuous tracking started with ID:', id);
    };

    // Fallback tracking with network positioning only
    const startNetworkFallbackTracking = () => {
      const networkOptions = {
        enableHighAccuracy: false, // Use network positioning
        timeout: 25000, // Even longer timeout for network
        maximumAge: 30000 // Allow older cached positions
      };

      const fallbackId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          console.log('LocationTracker: Network fallback location update', { latitude, longitude, accuracy });
          
          const processedLocation = processLocationUpdate(latitude, longitude, accuracy);
          
          if (!processedLocation) {
            console.log('LocationTracker: Fallback location update rejected by filter');
            return;
          }
          
          setCurrentLocation({ 
            latitude: processedLocation.latitude, 
            longitude: processedLocation.longitude 
          });
          setAccuracy(processedLocation.accuracy);
          setError('Using network positioning (reduced accuracy)');
          setLastLocationUpdate(new Date());
          
          const now = Date.now();
          if (socket && (now - lastBackendUpdateRef.current >= BACKEND_UPDATE_INTERVAL)) {
            socket.emit('location-update', {
              latitude: processedLocation.latitude,
              longitude: processedLocation.longitude,
              accuracy: processedLocation.accuracy,
              timestamp: new Date().toISOString()
            });
            lastBackendUpdateRef.current = now;
          }
        },
        (error) => {
          console.error('LocationTracker: Network fallback also failed', error);
          setError('Location services unavailable. Please check device settings.');
        },
        networkOptions
      );

      setWatchId(fallbackId);
      console.log('LocationTracker: Network fallback tracking started with ID:', fallbackId);
    };

    // Start the initial continuous tracking
    startContinuousTracking();
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
    if (accuracy < 10) return 'success';      // Excellent GPS
    if (accuracy < 50) return 'warning';      // Good GPS
    if (accuracy < 500) return 'error';       // Poor GPS
    if (accuracy < 10000) return 'default';   // Network positioning
    return 'default';                         // Very poor positioning
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
            severity={accuracy && accuracy > 10000 ? "warning" : "error"}
            sx={{ 
              mb: 2,
              borderRadius: 2
            }}
          >
            {error}
            {accuracy && accuracy > 10000 && (
              <>
                <br />
                <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                  💡 For better accuracy: Move outdoors, away from buildings, and wait 30-60 seconds for GPS lock
                </Typography>
              </>
            )}
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
                    label={accuracy > 1000 ? `±${(accuracy/1000).toFixed(1)}km` : `±${Math.round(accuracy)}m`}
                    color={getAccuracyColor(accuracy)}
                    size="small"
                    sx={{ 
                      bgcolor: accuracy > 10000 ? '#ff9800' : undefined,
                      color: accuracy > 10000 ? 'white' : undefined
                    }}
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