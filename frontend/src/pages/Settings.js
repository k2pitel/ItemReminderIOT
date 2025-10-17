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
  Divider
} from '@mui/material';
import Layout from '../components/Layout';
import api from '../services/api';

const Settings = () => {
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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

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
