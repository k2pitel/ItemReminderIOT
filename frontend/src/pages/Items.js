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
  Typography,
  FormControlLabel,
  Switch
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';
import Layout from '../components/Layout';
import api from '../services/api';

const Items = () => {
  const [items, setItems] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    deviceId: '',
    name: '',
    description: '',
    category: 'other',
    thresholdWeight: 10,
    unit: 'grams',
    wearableMode: false
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await api.get('/items');
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        deviceId: item.deviceId,
        name: item.name,
        description: item.description || '',
        category: item.category,
        thresholdWeight: item.thresholdWeight,
        unit: item.unit,
        wearableMode: item.wearableMode || false
      });
    } else {
      setEditingItem(null);
      setFormData({
        deviceId: '',
        name: '',
        description: '',
        category: 'other',
        thresholdWeight: 10,
        unit: 'grams',
        wearableMode: false
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
      case 'OK': return 'success';
      case 'LOW':
      case 'EMPTY': return 'warning';
      case 'OFFLINE': return 'error';
      default: return 'default';
    }
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
              <TableCell>Category</TableCell>
              <TableCell>Weight</TableCell>
              <TableCell>Threshold</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Wear Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item._id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.deviceId}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>
                  {item.currentWeight?.toFixed(1) || 0} {item.unit}
                </TableCell>
                <TableCell>
                  {item.thresholdWeight} {item.unit}
                </TableCell>
                <TableCell>
                  <Chip
                    label={item.status}
                    color={getStatusColor(item.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {item.wearableMode ? (
                    <Chip
                      label={item.wearStatus || 'N/A'}
                      color={item.wearStatus === 'ON' ? 'success' : item.wearStatus === 'OFF' ? 'error' : 'default'}
                      size="small"
                    />
                  ) : (
                    <Chip label="N/A" size="small" color="default" />
                  )}
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
            label="Category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            margin="normal"
          >
            <MenuItem value="medication">Medication</MenuItem>
            <MenuItem value="grocery">Grocery</MenuItem>
            <MenuItem value="supply">Supply</MenuItem>
            <MenuItem value="other">Other</MenuItem>
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
          
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.wearableMode}
                  onChange={(e) => setFormData({ ...formData, wearableMode: e.target.checked })}
                  name="wearableMode"
                />
              }
              label="Enable Wearable Mode (ON/OFF detection)"
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Enable this for items like jackets or bags that can be worn/carried. The system will detect ON (worn) or OFF (not worn) status and alert you if you leave without it.
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
