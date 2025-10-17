import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  LinearProgress
} from '@mui/material';
import Layout from '../components/Layout';
import api from '../services/api';

const Dashboard = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await api.get('/items');
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OK':
        return 'success';
      case 'LOW':
      case 'EMPTY':
        return 'warning';
      case 'OFFLINE':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPercentage = (current, threshold) => {
    if (threshold === 0) return 0;
    return Math.min((current / threshold) * 100, 100);
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
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {items.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="h6" align="center" color="text.secondary">
              No items yet. Add your first item to get started!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {items.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item._id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">{item.name}</Typography>
                    <Chip
                      label={item.status}
                      color={getStatusColor(item.status)}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {item.description || 'No description'}
                  </Typography>

                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">
                        Weight: {item.currentWeight?.toFixed(1) || 0} {item.unit}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Threshold: {item.thresholdWeight} {item.unit}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={getPercentage(item.currentWeight, item.thresholdWeight)}
                      color={getStatusColor(item.status)}
                    />
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Device: {item.deviceId}
                    </Typography>
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      Last updated: {new Date(item.lastReading).toLocaleString()}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Layout>
  );
};

export default Dashboard;
