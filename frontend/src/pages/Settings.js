import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Switch,
  FormControlLabel,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import { Person, NotificationsActive, Info } from '@mui/icons-material';
import Layout from '../components/Layout';
import LocationTracker from '../components/LocationTracker';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { user } = useAuth();
  
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: ''
  });
  const [notifications, setNotifications] = useState({
    email: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Add debugging
  useEffect(() => {
    console.log('Settings: Component mounted, user:', user);
    if (user) {
      fetchProfile();
    }
  }, [user]);

  // Add early return after hooks for safety
  if (!user) {
    return (
      <Layout>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            Settings
          </Typography>
          <Alert severity="info">Please log in to access settings.</Alert>
        </Box>
      </Layout>
    );
  }

  const fetchProfile = async () => {
    try {
      console.log('Settings: Fetching profile...');
      const response = await api.get('/users/me');
      console.log('Settings: Profile response:', response.data);
      setProfile({
        username: response.data.username,
        email: response.data.email,
        firstName: response.data.firstName || '',
        lastName: response.data.lastName || '',
        phoneNumber: response.data.phoneNumber || ''
      });
      setNotifications(response.data.notifications || { email: true });
    } catch (error) {
      console.error('Error fetching profile:', error);
      setMessage('Failed to load profile');
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

  // Add early return if no user (debugging)
  if (!user) {
    return (
      <Layout>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            Settings
          </Typography>
          <Alert severity="warning">
            Please log in to access settings.
          </Alert>
        </Box>
      </Layout>
    );
  }

  console.log('Settings: Rendering for user:', user.id || 'unknown');

  try {
    return (
      <Layout>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your profile, notifications, and location tracking preferences
          </Typography>
        </Box>

        {message && (
          <Alert 
            severity={message.includes('Error') ? 'error' : 'success'} 
            sx={{ mb: 3 }}
            onClose={() => setMessage('')}
          >
            {message}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Profile Settings */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Person sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Profile Information
                  </Typography>
                </Box>
                
                <Box component="form" onSubmit={handleUpdateProfile}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Username"
                        name="username"
                        value={profile?.username || ''}
                        disabled
                        variant="outlined"
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Email"
                        name="email"
                        type="email"
                        value={profile?.email || ''}
                        onChange={handleProfileChange}
                        required
                        variant="outlined"
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="First Name"
                        name="firstName"
                        value={profile?.firstName || ''}
                        onChange={handleProfileChange}
                        variant="outlined"
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Last Name"
                        name="lastName"
                        value={profile?.lastName || ''}
                        onChange={handleProfileChange}
                        variant="outlined"
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Phone Number"
                        name="phoneNumber"
                        value={profile?.phoneNumber || ''}
                        onChange={handleProfileChange}
                        variant="outlined"
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={loading}
                        sx={{ mt: 1 }}
                      >
                        {loading ? 'Updating...' : 'Update Profile'}
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>

            {/* Notifications Settings */}
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <NotificationsActive sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Notification Preferences
                  </Typography>
                </Box>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={notifications?.email || false}
                      onChange={handleNotificationChange}
                      name="email"
                    />
                  }
                  label="Email Notifications for Item Alerts"
                  sx={{ mb: 2 }}
                />
                
                <Button
                  variant="contained"
                  onClick={handleUpdateNotifications}
                  disabled={loading}
                  size="small"
                >
                  {loading ? 'Updating...' : 'Update Preferences'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Location Tracking */}
          <Grid item xs={12} lg={6}>
            <LocationTracker />

            {/* Mobile Location Options */}
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    📱 Alternative Location Methods
                  </Typography>
                </Box>
                
                <Alert severity="info" sx={{ mb: 2 }}>
                  If browser location is inaccurate due to poor network, try these alternatives:
                </Alert>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => {
                        const shareLink = `${window.location.origin}/api/location/share/phone-${user?.id}-${Date.now()}`;
                        navigator.clipboard.writeText(shareLink);
                        setMessage('Phone link copied! Open this on your phone: ' + shareLink);
                      }}
                    >
                      📱 Generate Phone Link
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => {
                        const lat = prompt('Enter Latitude (e.g. 59.329323):');
                        const lon = prompt('Enter Longitude (e.g. 18.068581):');
                        if (lat && lon) {
                          api.post('/location/manual-location', {
                            coordinates: { latitude: parseFloat(lat), longitude: parseFloat(lon) }
                          }).then(() => {
                            setMessage('Manual location set successfully!');
                          }).catch(() => {
                            setMessage('Error: Failed to set manual location');
                          });
                        }
                      }}
                    >
                      ✏️ Set Manual Location
                    </Button>
                  </Grid>
                </Grid>

                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  💡 Phone link provides better GPS accuracy. Manual entry works when network is poor.
                </Typography>
              </CardContent>
            </Card>

            {/* App Information */}
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Info sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    About ItemReminder IoT
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  <strong>Version:</strong> 1.0.0
                </Typography>
                
                <Typography variant="body2" color="text.secondary">
                  A smart, location-aware reminder system for tracking items like
                  medications, groceries, and supplies using ESP32, MQTT, and
                  real-time notifications.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Layout>
    );
  } catch (error) {
    console.error('Settings: Render error:', error);
    return (
      <Layout>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            Settings
          </Typography>
          <Alert severity="error">
            Error loading settings page. Please refresh and try again.
          </Alert>
        </Box>
      </Layout>
    );
  }
};

export default Settings;