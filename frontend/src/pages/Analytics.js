import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  MenuItem,
  TextField,
  Paper
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import Layout from '../components/Layout';
import api from '../services/api';

const Analytics = () => {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [period, setPeriod] = useState('7d');
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (selectedItem) {
      fetchAnalytics();
    }
  }, [selectedItem, period]);

  const fetchItems = async () => {
    try {
      const response = await api.get('/items');
      setItems(response.data);
      if (response.data.length > 0) {
        setSelectedItem(response.data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await api.get(`/readings/analytics/${selectedItem}`, {
        params: { period }
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  if (!selectedItem) {
    return (
      <Layout>
        <Typography variant="h6" align="center" color="text.secondary">
          No items available for analytics
        </Typography>
      </Layout>
    );
  }

  return (
    <Layout>
      <Typography variant="h4" gutterBottom>
        Analytics
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Select Item"
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
            >
              {items.map((item) => (
                <MenuItem key={item._id} value={item._id}>
                  {item.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Time Period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <MenuItem value="1d">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Box>

      {analytics && (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Total Readings
                  </Typography>
                  <Typography variant="h4">{analytics.totalReadings}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Average Weight
                  </Typography>
                  <Typography variant="h4">
                    {analytics.averageWeight !== null ? analytics.averageWeight.toFixed(1) : 'N/A'}g
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Min Weight
                  </Typography>
                  <Typography variant="h4">
                    {analytics.minWeight !== null ? analytics.minWeight.toFixed(1) : 'N/A'}g
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Max Weight
                  </Typography>
                  <Typography variant="h4">
                    {analytics.maxWeight !== null ? analytics.maxWeight.toFixed(1) : 'N/A'}g
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Weight Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value) => [`${value !== null ? value.toFixed(2) : 'N/A'}g`, 'Weight']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="averageWeight"
                  stroke="#1976d2"
                  name="Average Weight"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Reading Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                />
                <Legend />
                <Bar dataKey="count" fill="#1976d2" name="Number of Readings" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </>
      )}
    </Layout>
  );
};

export default Analytics;
