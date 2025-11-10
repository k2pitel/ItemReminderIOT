import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Chip
} from '@mui/material';
import { LocationOn, GpsFixed } from '@mui/icons-material';
import Layout from '../components/Layout';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: ''
  });
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false
  });
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProfile();
    
    // Check if tracking was previously enabled
    const savedTracking = localStorage.getItem('locationTrackingEnabled') === 'true';
    if (savedTracking) {
      setIsTracking(true);
      startTracking();
    }
  }, []);

  useEffect(() => {
    if (!socket || !user) return;

    // Authenticate socket for location tracking
    socket.emit('authenticate', { userId: user.id });

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [socket, user]);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/users/me');
      setProfile({
        username: response.data.username,
        email: response.data.email,
        firstName: response.data.firstName || '',
        lastName: response.data.lastName || '',
        phoneNumber: response.data.phoneNumber || ''
      });
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleProfileChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    });
  };

  const handleNotificationChange = (e) => {
    setNotifications({
      ...notifications,
      [e.target.name]: e.target.checked
    });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await api.put('/users/me', profile);
      setMessage('Profile updated successfully');
    } catch (error) {
      setMessage('Error updating profile');
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNotifications = async () => {
    setLoading(true);
    setMessage('');

    try {
      await api.put('/users/me/notifications', notifications);
      setMessage('Notification preferences updated successfully');
    } catch (error) {
      setMessage('Error updating notification preferences');
      console.error('Error updating notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    setLocationError(null);

    // Variables for smoothing
    let positionHistory = [];
    const HISTORY_SIZE = 5; // Average of last 5 positions
    const MIN_MOVEMENT_THRESHOLD = 10; // Minimum 10 meters to update
    let lastUpdateTime = 0;
    const MIN_UPDATE_INTERVAL = 3000; // Minimum 3 seconds between updates

    const options = {
      enableHighAccuracy: true,
      timeout: 30000, // Increased timeout to 30 seconds
      maximumAge: 10000 // Allow cached positions up to 10 seconds old
    };

    // Helper function to calculate distance between two points (Haversine formula)
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371e3; // Earth's radius in meters
      const φ1 = lat1 * Math.PI / 180;
      const φ2 = lat2 * Math.PI / 180;
      const Δφ = (lat2 - lat1) * Math.PI / 180;
      const Δλ = (lon2 - lon1) * Math.PI / 180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      return R * c; // Distance in meters
    };

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const now = Date.now();
        
        // Add to history
        positionHistory.push({ latitude, longitude, accuracy });
        
        // Keep only recent positions
        if (positionHistory.length > HISTORY_SIZE) {
          positionHistory.shift();
        }

        // Calculate smoothed position (average of recent positions)
        const smoothedLat = positionHistory.reduce((sum, pos) => sum + pos.latitude, 0) / positionHistory.length;
        const smoothedLon = positionHistory.reduce((sum, pos) => sum + pos.longitude, 0) / positionHistory.length;
        const avgAccuracy = positionHistory.reduce((sum, pos) => sum + pos.accuracy, 0) / positionHistory.length;

        // Only update if we've moved significantly or don't have a current location
        let shouldUpdate = !currentLocation;
        
        if (currentLocation && now - lastUpdateTime > MIN_UPDATE_INTERVAL) {
          const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            smoothedLat,
            smoothedLon
          );
          
          // Update if moved more than threshold OR accuracy improved significantly
          shouldUpdate = distance > MIN_MOVEMENT_THRESHOLD || (accuracy < 20 && accuracy < avgAccuracy / 2);
        }

        if (shouldUpdate) {
          lastUpdateTime = now;
          setCurrentLocation({ latitude: smoothedLat, longitude: smoothedLon });
          setAccuracy(avgAccuracy);
          
          // Send location to backend
          if (socket) {
            socket.emit('location-update', {
              latitude: smoothedLat,
              longitude: smoothedLon,
              accuracy: avgAccuracy,
              timestamp: new Date().toISOString()
            });
          }
        }
      },
      (error) => {
        console.warn('Location error:', error);
        // Don't disable tracking on timeout errors
        if (error.code !== error.TIMEOUT) {
          setLocationError(`Location error: ${error.message}`);
          setIsTracking(false);
          localStorage.setItem('locationTrackingEnabled', 'false');
        }
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
    setCurrentLocation(null);
    setAccuracy(null);
  };

  const handleTrackingToggle = (event) => {
    const enabled = event.target.checked;
    setIsTracking(enabled);
    localStorage.setItem('locationTrackingEnabled', enabled.toString());
    
    if (enabled) {
      startTracking();
    } else {
      stopTracking();
    }
  };

  return (
    <Layout>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      {message && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography>{message}</Typography>
        </Box>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Profile Information
            </Typography>
            <form onSubmit={handleUpdateProfile}>
              <TextField
                fullWidth
                label="Username"
                name="username"
                value={profile.username}
                margin="normal"
                disabled
              />
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={profile.email}
                onChange={handleProfileChange}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="First Name"
                name="firstName"
                value={profile.firstName}
                onChange={handleProfileChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Last Name"
                name="lastName"
                value={profile.lastName}
                onChange={handleProfileChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Phone Number"
                name="phoneNumber"
                value={profile.phoneNumber}
                onChange={handleProfileChange}
                margin="normal"
              />
              <Button
                type="submit"
                variant="contained"
                sx={{ mt: 2 }}
                disabled={loading}
              >
                Update Profile
              </Button>
            </form>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Notification Preferences
            </Typography>
            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.email}
                    onChange={handleNotificationChange}
                    name="email"
                  />
                }
                label="Email Notifications"
              />
            </Box>
            <Box sx={{ mt: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.push}
                    onChange={handleNotificationChange}
                    name="push"
                  />
                }
                label="Push Notifications"
              />
            </Box>
            <Box sx={{ mt: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.sms}
                    onChange={handleNotificationChange}
                    name="sms"
                  />
                }
                label="SMS Notifications"
              />
            </Box>
            <Button
              variant="contained"
              sx={{ mt: 3 }}
              onClick={handleUpdateNotifications}
              disabled={loading}
            >
              Update Preferences
            </Button>
          </Paper>

          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              📍 Location Tracking
            </Typography>
            <Divider sx={{ my: 2 }} />
            
            {locationError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {locationError}
              </Alert>
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={isTracking}
                  onChange={handleTrackingToggle}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">
                    Enable GPS Tracking
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Track your location for geofence alerts
                  </Typography>
                </Box>
              }
            />

            {isTracking && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <GpsFixed color="success" />
                  <Chip label="Tracking Active" color="success" size="small" />
                </Box>
                {currentLocation && (
                  <>
                    <Typography variant="body2">
                      <LocationOn fontSize="small" sx={{ verticalAlign: 'middle' }} />
                      {' '}Latitude: {currentLocation.latitude.toFixed(6)}
                    </Typography>
                    <Typography variant="body2">
                      <LocationOn fontSize="small" sx={{ verticalAlign: 'middle' }} />
                      {' '}Longitude: {currentLocation.longitude.toFixed(6)}
                    </Typography>
                    {accuracy && (
                      <Typography variant="caption" color="text.secondary">
                        Accuracy: ±{Math.round(accuracy)}m
                      </Typography>
                    )}
                  </>
                )}
              </Box>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              💡 Location tracking runs in the background and enables geofence alerts when you enter or leave configured areas.
            </Typography>
          </Paper>

          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              About
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary" paragraph>
              <strong>IoT Item Reminder</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Version 1.0.0
            </Typography>
            <Typography variant="body2" color="text.secondary">
              A smart, location-aware reminder system for tracking items like
              medications, groceries, and supplies using ESP32, MQTT, and
              real-time notifications.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Layout>
  );
};

export default Settings;
