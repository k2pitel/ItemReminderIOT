import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  Box,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Grid,
  Snackbar,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  LocationOn,
  PhoneAndroid,
  QrCode,
  Edit,
  Share,
  Refresh,
  ContentCopy,
  Launch
} from '@mui/icons-material';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// Original LocationTracker as backup
import OriginalLocationTracker from './LocationTracker';

const EnhancedLocationTracker = () => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [trackingMethod, setTrackingMethod] = useState('browser'); // browser, mobile, manual
  const [currentLocation, setCurrentLocation] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);
  const [shareDialog, setShareDialog] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [manualDialog, setManualDialog] = useState(false);
  const [manualCoords, setManualCoords] = useState({ lat: '', lon: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (!socket || !user) return;

    // Listen for mobile location updates
    socket.on('mobile-location-update', (data) => {
      if (data.userId === user.id) {
        setCurrentLocation({
          latitude: data.latitude,
          longitude: data.longitude
        });
        setAccuracy(data.accuracy);
        setLastUpdate(new Date(data.timestamp));
        setError(null);
        setTrackingMethod('mobile');
      }
    });

    return () => {
      socket.off('mobile-location-update');
    };
  }, [socket, user]);

  const generateShareLink = async () => {
    try {
      const response = await api.post('/location/generate-share-link');
      setShareLink(response.data.shareLink);
      setShareDialog(true);
      setSnackbar({ open: true, message: 'Share link generated!' });
    } catch (error) {
      setError('Failed to generate share link');
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    setSnackbar({ open: true, message: 'Link copied to clipboard!' });
  };

  const openShareLink = () => {
    window.open(shareLink, '_blank');
  };

  const setManualLocation = async () => {
    try {
      const latitude = parseFloat(manualCoords.lat);
      const longitude = parseFloat(manualCoords.lon);

      if (isNaN(latitude) || isNaN(longitude)) {
        setError('Please enter valid coordinates');
        return;
      }

      const response = await api.post('/location/manual-location', {
        coordinates: { latitude, longitude, accuracy: 1000 }
      });

      setCurrentLocation({ latitude, longitude });
      setAccuracy(1000);
      setLastUpdate(new Date());
      setTrackingMethod('manual');
      setManualDialog(false);
      setSnackbar({ open: true, message: 'Manual location set!' });
    } catch (error) {
      setError('Failed to set manual location');
    }
  };

  const refreshMobileLocation = async () => {
    try {
      const response = await api.get('/location/mobile-location');
      const { location } = response.data;
      
      setCurrentLocation({
        latitude: location.latitude,
        longitude: location.longitude
      });
      setAccuracy(location.accuracy);
      setLastUpdate(new Date(location.timestamp));
      setTrackingMethod('mobile');
      setSnackbar({ open: true, message: 'Location refreshed!' });
    } catch (error) {
      setError('No recent mobile location found');
    }
  };

  const getMethodColor = (method) => {
    switch (method) {
      case 'browser': return 'primary';
      case 'mobile': return 'success';
      case 'manual': return 'warning';
      default: return 'default';
    }
  };

  const getMethodIcon = (method) => {
    switch (method) {
      case 'browser': return <LocationOn />;
      case 'mobile': return <PhoneAndroid />;
      case 'manual': return <Edit />;
      default: return <LocationOn />;
    }
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            📍 Enhanced Location Tracking
          </Typography>
          {trackingMethod && (
            <Chip
              icon={getMethodIcon(trackingMethod)}
              label={trackingMethod.charAt(0).toUpperCase() + trackingMethod.slice(1)}
              color={getMethodColor(trackingMethod)}
              size="small"
            />
          )}
        </Box>

        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
          <Tab label="Browser GPS" />
          <Tab label="Phone/Mobile" />
          <Tab label="Manual Entry" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Browser GPS Tab */}
        {tabValue === 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Use your computer's location services (WiFi/GPS)
            </Typography>
            <OriginalLocationTracker />
          </Box>
        )}

        {/* Mobile/Phone Tab */}
        {tabValue === 1 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Get more accurate location from your phone
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="contained"
                  startIcon={<Share />}
                  onClick={generateShareLink}
                  fullWidth
                  size="small"
                >
                  Generate Phone Link
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={refreshMobileLocation}
                  fullWidth
                  size="small"
                >
                  Refresh Location
                </Button>
              </Grid>
            </Grid>

            {currentLocation && trackingMethod === 'mobile' && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="success.dark">
                  📱 Mobile Location Active
                </Typography>
                <Typography variant="body2">
                  Lat: {currentLocation.latitude.toFixed(6)}<br/>
                  Lon: {currentLocation.longitude.toFixed(6)}<br/>
                  {accuracy && `Accuracy: ±${Math.round(accuracy)}m`}<br/>
                  {lastUpdate && `Updated: ${lastUpdate.toLocaleTimeString()}`}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Manual Entry Tab */}
        {tabValue === 2 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter coordinates manually (useful for poor network conditions)
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<Edit />}
              onClick={() => setManualDialog(true)}
              fullWidth
              size="small"
            >
              Set Manual Location
            </Button>

            {currentLocation && trackingMethod === 'manual' && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="warning.dark">
                  ✏️ Manual Location Set
                </Typography>
                <Typography variant="body2">
                  Lat: {currentLocation.latitude.toFixed(6)}<br/>
                  Lon: {currentLocation.longitude.toFixed(6)}<br/>
                  Accuracy: ±1km (estimated)<br/>
                  {lastUpdate && `Set: ${lastUpdate.toLocaleTimeString()}`}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Share Link Dialog */}
        <Dialog open={shareDialog} onClose={() => setShareDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>📱 Share Location from Phone</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              Open this link on your phone to share location with better GPS accuracy
            </Alert>
            
            <TextField
              fullWidth
              value={shareLink}
              variant="outlined"
              size="small"
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <Box>
                    <Tooltip title="Copy Link">
                      <IconButton onClick={copyShareLink} size="small">
                        <ContentCopy />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Open Link">
                      <IconButton onClick={openShareLink} size="small">
                        <Launch />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )
              }}
              sx={{ mb: 2 }}
            />

            <Typography variant="body2" color="text.secondary">
              <strong>Instructions:</strong>
              <br/>1. Copy this link and open it on your phone
              <br/>2. Grant location permission when prompted
              <br/>3. Tap "Share Current Location" or "Start Continuous Sharing"
              <br/>4. Your phone's GPS location will appear here automatically
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShareDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Manual Location Dialog */}
        <Dialog open={manualDialog} onClose={() => setManualDialog(false)}>
          <DialogTitle>✏️ Set Manual Location</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              Enter GPS coordinates manually. Use this when network conditions are poor.
            </Alert>
            
            <TextField
              fullWidth
              label="Latitude"
              value={manualCoords.lat}
              onChange={(e) => setManualCoords({...manualCoords, lat: e.target.value})}
              placeholder="e.g., 59.329323"
              margin="normal"
              type="number"
              inputProps={{ step: "any" }}
            />
            
            <TextField
              fullWidth
              label="Longitude"
              value={manualCoords.lon}
              onChange={(e) => setManualCoords({...manualCoords, lon: e.target.value})}
              placeholder="e.g., 18.068581"
              margin="normal"
              type="number"
              inputProps={{ step: "any" }}
            />

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              💡 Tip: You can get coordinates from Google Maps by right-clicking on a location
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setManualDialog(false)}>Cancel</Button>
            <Button onClick={setManualLocation} variant="contained">Set Location</Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({...snackbar, open: false})}
          message={snackbar.message}
        />
      </CardContent>
    </Card>
  );
};

export default EnhancedLocationTracker;