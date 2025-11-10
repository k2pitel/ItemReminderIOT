import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  MenuItem,
  Typography
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';
import Layout from '../components/Layout';
import api from '../services/api';

const Items = () => {
  const [items, setItems] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    deviceId: '',
    name: '',
    description: '',
    geofenceId: '',
    triggerCondition: 'exit',
    customAlertMessage: '',
    thresholdWeight: 10,
    unit: 'grams',
    detectionMode: 'weight'
  });

  useEffect(() => {
    fetchItems();
    fetchGeofences();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await api.get('/items');
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const fetchGeofences = async () => {
    try {
      const response = await api.get('/geofence');
      setGeofences(response.data);
    } catch (error) {
      console.error('Error fetching geofences:', error);
    }
  };

  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        deviceId: item.deviceId,
        name: item.name,
        description: item.description || '',
        geofenceId: item.geofenceId || '',
        triggerCondition: item.triggerCondition || 'exit',
        customAlertMessage: item.customAlertMessage || '',
        thresholdWeight: item.thresholdWeight,
        unit: item.unit,
        detectionMode: item.detectionMode || 'weight'
      });
    } else {
      setEditingItem(null);
      setFormData({
        deviceId: '',
        name: '',
        description: '',
        geofenceId: '',
        triggerCondition: 'exit',
        customAlertMessage: '',
        thresholdWeight: 10,
        unit: 'grams',
        detectionMode: 'weight'
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async () => {
    try {
      if (editingItem) {
        await api.put(`/items/${editingItem._id}`, formData);
      } else {
        await api.post('/items', formData);
      }
      fetchItems();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await api.delete(`/items/${id}`);
        fetchItems();
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
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

  return (
    <Layout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Items</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Item
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Device ID</TableCell>
              <TableCell>Geofence</TableCell>
              <TableCell>Weight</TableCell>
              <TableCell>Threshold</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Mode</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item._id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.deviceId}</TableCell>
                <TableCell>
                  {item.geofenceId ? (
                    geofences.find(g => g._id === item.geofenceId)?.name || 'Unknown'
                  ) : (
                    <Chip label="None" size="small" variant="outlined" />
                  )}
                </TableCell>
                <TableCell>
                  {item.currentWeight?.toFixed(1) || 0} {item.unit}
                </TableCell>
                <TableCell>
                  {item.thresholdWeight} {item.unit}
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(item)}
                    color={getStatusColor(item.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={item.detectionMode === 'wearable' ? 'ON/OFF' : 'Low/OK'}
                    color={item.detectionMode === 'wearable' ? 'secondary' : 'primary'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(item)}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(item._id)}
                  >
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingItem ? 'Edit Item' : 'Add Item'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Device ID"
            name="deviceId"
            value={formData.deviceId}
            onChange={handleChange}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={2}
          />
          
          <TextField
            fullWidth
            select
            label="Geofence"
            name="geofenceId"
            value={formData.geofenceId}
            onChange={handleChange}
            margin="normal"
            helperText="Select which geofence this item belongs to"
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {geofences.map((geofence) => (
              <MenuItem key={geofence._id} value={geofence._id}>
                {geofence.name}
              </MenuItem>
            ))}
          </TextField>

          {formData.geofenceId && (
            <>
              <TextField
                fullWidth
                select
                label="Trigger Condition"
                name="triggerCondition"
                value={formData.triggerCondition}
                onChange={handleChange}
                margin="normal"
                helperText="When should this item trigger an alert?"
              >
                <MenuItem value="enter">When Entering Geofence</MenuItem>
                <MenuItem value="exit">When Exiting Geofence</MenuItem>
                <MenuItem value="both">Both Enter and Exit</MenuItem>
              </TextField>

              <TextField
                fullWidth
                label="Custom Alert Message"
                name="customAlertMessage"
                value={formData.customAlertMessage}
                onChange={handleChange}
                margin="normal"
                multiline
                rows={2}
                helperText="Custom message to show when alert triggers (optional)"
                placeholder="Example: Don't forget your jacket!"
              />
            </>
          )}

          <TextField
            fullWidth
            select
            label="Detection Mode"
            name="detectionMode"
            value={formData.detectionMode}
            onChange={handleChange}
            margin="normal"
            helperText="How should this item be monitored?"
          >
            <MenuItem value="weight">Weight Mode (Low/OK based on weight)</MenuItem>
            <MenuItem value="wearable">Wearable Mode (ON/OFF detection)</MenuItem>
          </TextField>

          <TextField
            fullWidth
            label="Threshold Weight"
            name="thresholdWeight"
            type="number"
            value={formData.thresholdWeight}
            onChange={handleChange}
            margin="normal"
            required
            helperText={formData.detectionMode === 'weight' ? 'Alert when weight is below this value' : 'Reference weight for this item'}
          />
          <TextField
            fullWidth
            select
            label="Unit"
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            margin="normal"
          >
            <MenuItem value="grams">Grams</MenuItem>
            <MenuItem value="kg">Kilograms</MenuItem>
            <MenuItem value="oz">Ounces</MenuItem>
            <MenuItem value="lbs">Pounds</MenuItem>
          </TextField>
          
          <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              <strong>Weight Mode:</strong> Alerts when item weight falls below threshold (e.g., pills running low)<br/>
              <strong>Wearable Mode:</strong> Detects ON (worn) or OFF (not worn) status from sensor (e.g., jacket, keys)
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingItem ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default Items;
