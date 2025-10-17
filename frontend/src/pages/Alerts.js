import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Divider,
  Button
} from '@mui/material';
import { Delete, CheckCircle } from '@mui/icons-material';
import Layout from '../components/Layout';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const { socket } = useSocket();

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('new_alert', handleNewAlert);
      return () => socket.off('new_alert');
    }
  }, [socket]);

  const fetchAlerts = async () => {
    try {
      const response = await api.get('/alerts');
      setAlerts(response.data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const handleNewAlert = (alert) => {
    setAlerts(prev => [alert, ...prev]);
  };

  const handleMarkAsRead = async (alertId) => {
    try {
      await api.patch(`/alerts/${alertId}/read`);
      setAlerts(prev =>
        prev.map(alert =>
          alert._id === alertId ? { ...alert, read: true } : alert
        )
      );
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const handleDelete = async (alertId) => {
    try {
      await api.delete(`/alerts/${alertId}`);
      setAlerts(prev => prev.filter(alert => alert._id !== alertId));
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'default';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'low_weight':
        return 'Low Weight';
      case 'offline':
        return 'Offline';
      case 'geofence':
        return 'Geofence';
      default:
        return type;
    }
  };

  return (
    <Layout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Alerts</Typography>
        <Button
          variant="outlined"
          onClick={fetchAlerts}
        >
          Refresh
        </Button>
      </Box>

      {alerts.length === 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography align="center" color="text.secondary">
            No alerts
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <List>
            {alerts.map((alert, index) => (
              <React.Fragment key={alert._id}>
                <ListItem
                  sx={{
                    bgcolor: alert.read ? 'inherit' : 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' }
                  }}
                  secondaryAction={
                    <Box>
                      {!alert.read && (
                        <IconButton
                          edge="end"
                          onClick={() => handleMarkAsRead(alert._id)}
                          sx={{ mr: 1 }}
                        >
                          <CheckCircle />
                        </IconButton>
                      )}
                      <IconButton
                        edge="end"
                        color="error"
                        onClick={() => handleDelete(alert._id)}
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" fontWeight={alert.read ? 'normal' : 'bold'}>
                          {alert.message}
                        </Typography>
                        <Chip
                          label={getTypeLabel(alert.type)}
                          size="small"
                          color={getSeverityColor(alert.severity)}
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(alert.createdAt).toLocaleString()}
                        </Typography>
                        {alert.itemId && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            Item: {alert.itemId.name}
                          </Typography>
                        )}
                        {alert.data && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {JSON.stringify(alert.data)}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
                {index < alerts.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
    </Layout>
  );
};

export default Alerts;
