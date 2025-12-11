import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import { LocationOn, LocationOff, Refresh } from '@mui/icons-material';
import Layout from '../components/Layout';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [geofenceStatus, setGeofenceStatus] = useState([]);

  useEffect(() => {
    fetchItems();
    
    // Polling interval: Refetch items every 10 seconds to ensure we have latest data
    const pollInterval = setInterval(() => {
      fetchItems();
    }, 10000);

    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    if (!socket || !user) return;

    // Listen for weight updates from sensors
    socket.on('weight_update', (data) => {
      console.log('Dashboard: Received weight update', data);
      setItems(prevItems =>
        prevItems.map(item => {
          // Match by itemId or deviceId
          if (item._id === data.itemId || item.deviceId === data.deviceId) {
            return {
              ...item,
              currentWeight: data.weight,
              status: data.status,
              wearStatus: data.wearStatus || item.wearStatus,
              isWorn: data.isWorn !== undefined ? data.isWorn : item.isWorn,
              lastReading: data.timestamp || new Date()
            };
          }
          return item;
        })
      );
    });

    // Listen for status updates
    socket.on('status_update', (data) => {
      console.log('Dashboard: Received status update', data);
      setItems(prevItems =>
        prevItems.map(item => {
          if (item._id === data.itemId || item.deviceId === data.deviceId) {
            return {
              ...item,
              status: data.status,
              lastReading: data.timestamp || new Date()
            };
          }
          return item;
        })
      );
    });

    // Listen for geofence updates
    socket.on('geofence-update', (data) => {
      setGeofenceStatus(data.geofenceStatus || []);
    });

    // Listen for item updates
    socket.on('item-update', (data) => {
      console.log('Dashboard: Received item update', data);
      if (data.action === 'create') {
        setItems(prevItems => [...prevItems, data.item]);
      } else if (data.action === 'update') {
        setItems(prevItems => 
          prevItems.map(item => item._id === data.item._id ? data.item : item)
        );
      } else if (data.action === 'delete') {
        setItems(prevItems => prevItems.filter(item => item._id !== data.itemId));
      }
    });

    return () => {
      socket.off('weight_update');
      socket.off('status_update');
      socket.off('geofence-update');
      socket.off('item-update');
    };
  }, [socket, user]);

  const fetchItems = async () => {
    try {
      setRefreshing(true);
      const response = await api.get('/items');
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchItems();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OK':
      case 'ON':
        return 'success';
      case 'LOW':
      case 'EMPTY':
      case 'OFF':
        return 'warning';
      case 'OFFLINE':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (item) => {
    // For wearable mode, show ON/OFF
    if (item.detectionMode === 'wearable') {
      return item.status === 'ON' || item.status === 'OFF' ? item.status : item.wearStatus || 'N/A';
    }
    // For weight mode, show LOW/OK/EMPTY
    return item.status;
  };

  const getPercentage = (current, threshold) => {
    if (threshold === 0) return 0;
    return Math.min((current / threshold) * 100, 100);
  };

  const getGeofenceStatus = (item) => {
    if (!item.geofenceId) return null;
    
    const geofence = geofenceStatus.find(g => g.geofenceId === item.geofenceId);
    return geofence;
  };

  if (loading) {
    return (
      <Layout>
        <Box sx={{ width: '100%' }}>
          <LinearProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 500 }}>
          Dashboard
        </Typography>
        <Tooltip title="Refresh items">
          <IconButton onClick={handleRefresh} disabled={refreshing}>
            <Refresh sx={{ transform: refreshing ? 'rotate(360deg)' : 'none', transition: 'transform 1s' }} />
          </IconButton>
        </Tooltip>
      </Box>
      <Grid container spacing={3}>
        {items.length === 0 ? (
          <Grid item xs={12}>
            <Card sx={{ textAlign: 'center', py: 8 }}>
              <CardContent>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                  No items yet
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Add your first item to start tracking
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ) : (
          items.map((item) => {
            const lastReadingTime = item.lastReading ? new Date(item.lastReading).getTime() : 0;
            const ageMs = Date.now() - lastReadingTime;
            const isRecent = lastReadingTime && ageMs < 60000; // consider recent within 60s
            const displayWeight = isRecent ? (item.currentWeight ?? 0).toFixed(1) : null;
            const displayStatus = isRecent ? item.status : 'OFFLINE';

            return (
              <Grid item xs={12} sm={6} md={4} key={item._id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 500, flex: 1 }}>
                        {item.name}
                      </Typography>
                      <Chip
                        label={getStatusLabel({ ...item, status: displayStatus })}
                        color={getStatusColor(displayStatus)}
                        size="small"
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.8125rem' }}>
                      {item.description || 'No description'}
                    </Typography>

                    <Box sx={{ 
                      mb: 2, 
                      p: 1.5, 
                      borderRadius: 1, 
                      bgcolor: 'grey.50'
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {item.detectionMode === 'wearable' ? 'Status' : 'Weight'}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {item.detectionMode === 'wearable' 
                            ? getStatusLabel(item) 
                            : (displayWeight !== null ? `${displayWeight} ${item.unit}` : 'No recent reading')
                          }
                        </Typography>
                      </Box>
                      {item.detectionMode !== 'wearable' && (
                        <>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Threshold
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 500 }}>
                              {item.thresholdWeight} {item.unit}
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={getPercentage(isRecent ? item.currentWeight : 0, item.thresholdWeight)}
                            color={getStatusColor(displayStatus)}
                            sx={{ 
                              height: 4, 
                              borderRadius: 2,
                              bgcolor: 'grey.200' 
                            }}
                          />
                        </>
                      )}
                    </Box>

                    {item.geofenceId && (
                      <Box sx={{ mb: 2 }}>
                        {(() => {
                          const geoStatus = getGeofenceStatus(item);
                          if (geoStatus) {
                            return (
                              <Chip
                                icon={<LocationOn />}
                                label={`Inside: ${geoStatus.geofenceName}`}
                                color="success"
                                size="small"
                                sx={{ fontWeight: 600 }}
                              />
                            );
                          } else {
                            return (
                              <Chip
                                icon={<LocationOff />}
                                label="Outside geofence"
                                size="small"
                                sx={{ fontWeight: 600 }}
                              />
                            );
                          }
                        })()}
                      </Box>
                    )}

                    <Box sx={{ 
                      pt: 2, 
                      borderTop: '1px solid',
                      borderColor: 'grey.200'
                    }}>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                        Device ID: <strong>{item.deviceId}</strong>
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Last updated: {item.lastReading ? new Date(item.lastReading).toLocaleString() : 'Never'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })
        )}
      </Grid>
    </Layout>
  );
};

export default Dashboard;
