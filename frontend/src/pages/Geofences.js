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
  MenuItem,
  Typography,
  Chip,
  FormControlLabel,
  Switch,
  Divider
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import Layout from '../components/Layout';
import api from '../services/api';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position ? <Marker position={position} /> : null;
};

const Geofences = () => {
  const [geofences, setGeofences] = useState([]);
  const [items, setItems] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState(null);
  const [mapPosition, setMapPosition] = useState(null);
  const [formData, setFormData] = useState({
    itemId: '',
    name: '',
    latitude: 0,
    longitude: 0,
    radius: 100,
    triggerCondition: 'both',
    alertWhenLow: true,
    alertSettings: {
      leaveWithoutItems: true,
      emailNotifications: true,
      pushNotifications: true
    }
  });

  useEffect(() => {
    fetchGeofences();
    fetchItems();
  }, []);

  const fetchGeofences = async () => {
    try {
      const response = await api.get('/geofence');
      setGeofences(response.data);
    } catch (error) {
      console.error('Error fetching geofences:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await api.get('/items');
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const handleOpenDialog = (geofence = null) => {
    if (geofence) {
      setEditingGeofence(geofence);
      setFormData({
        itemId: geofence.itemId._id,
        name: geofence.name,
        latitude: geofence.location.latitude,
        longitude: geofence.location.longitude,
        radius: geofence.radius,
        triggerCondition: geofence.triggerCondition,
        alertWhenLow: geofence.alertWhenLow,
        alertSettings: geofence.alertSettings || {
          leaveWithoutItems: true,
          emailNotifications: true,
          pushNotifications: true
        }
      });
      setMapPosition({
        lat: geofence.location.latitude,
        lng: geofence.location.longitude
      });
    } else {
      setEditingGeofence(null);
      setFormData({
        itemId: items[0]?._id || '',
        name: '',
        latitude: 0,
        longitude: 0,
        radius: 100,
        triggerCondition: 'both',
        alertWhenLow: true,
        alertSettings: {
          leaveWithoutItems: true,
          emailNotifications: true,
          pushNotifications: true
        }
      });
      setMapPosition(null);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingGeofence(null);
    setMapPosition(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle nested alertSettings
    if (name.startsWith('alertSettings.')) {
      const settingName = name.split('.')[1];
      setFormData({
        ...formData,
        alertSettings: {
          ...formData.alertSettings,
          [settingName]: type === 'checkbox' ? checked : value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };

  useEffect(() => {
    if (mapPosition) {
      setFormData(prev => ({
        ...prev,
        latitude: mapPosition.lat,
        longitude: mapPosition.lng
      }));
    }
  }, [mapPosition]);

  const handleSubmit = async () => {
    try {
      const data = {
        itemId: formData.itemId,
        name: formData.name,
        location: {
          latitude: formData.latitude,
          longitude: formData.longitude
        },
        radius: formData.radius,
        triggerCondition: formData.triggerCondition,
        alertWhenLow: formData.alertWhenLow
      };

      if (editingGeofence) {
        await api.put(`/geofence/${editingGeofence._id}`, data);
      } else {
        await api.post('/geofence', data);
      }
      fetchGeofences();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving geofence:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this geofence?')) {
      try {
        await api.delete(`/geofence/${id}`);
        fetchGeofences();
      } catch (error) {
        console.error('Error deleting geofence:', error);
      }
    }
  };

  return (
    <Layout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Geofences</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          disabled={items.length === 0}
        >
          Add Geofence
        </Button>
      </Box>

      {items.length === 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography align="center" color="text.secondary">
            Add items first before creating geofences
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Item</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Radius</TableCell>
                <TableCell>Trigger</TableCell>
                <TableCell>Alert When Low</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {geofences.map((geofence) => (
                <TableRow key={geofence._id}>
                  <TableCell>{geofence.name}</TableCell>
                  <TableCell>{geofence.itemId?.name || 'N/A'}</TableCell>
                  <TableCell>
                    {geofence.location.latitude.toFixed(4)}, {geofence.location.longitude.toFixed(4)}
                  </TableCell>
                  <TableCell>{geofence.radius}m</TableCell>
                  <TableCell>
                    <Chip label={geofence.triggerCondition} size="small" />
                  </TableCell>
                  <TableCell>
                    {geofence.alertWhenLow ? 'Yes' : 'No'}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(geofence)}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(geofence._id)}
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingGeofence ? 'Edit Geofence' : 'Add Geofence'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            select
            label="Item"
            name="itemId"
            value={formData.itemId}
            onChange={handleChange}
            margin="normal"
            required
          >
            {items.map((item) => (
              <MenuItem key={item._id} value={item._id}>
                {item.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="Geofence Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            margin="normal"
            required
          />
          
          <Box sx={{ my: 2 }}>
            <Typography variant="body2" gutterBottom>
              Click on the map to set location
            </Typography>
            <MapContainer
              center={mapPosition || [0, 0]}
              zoom={mapPosition ? 13 : 2}
              style={{ height: '300px', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              <LocationMarker position={mapPosition} setPosition={setMapPosition} />
              {mapPosition && (
                <Circle
                  center={mapPosition}
                  radius={formData.radius}
                  pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.2 }}
                />
              )}
            </MapContainer>
          </Box>

          <TextField
            fullWidth
            label="Latitude"
            name="latitude"
            type="number"
            value={formData.latitude}
            onChange={handleChange}
            margin="normal"
            required
            inputProps={{ step: 0.000001 }}
          />
          <TextField
            fullWidth
            label="Longitude"
            name="longitude"
            type="number"
            value={formData.longitude}
            onChange={handleChange}
            margin="normal"
            required
            inputProps={{ step: 0.000001 }}
          />
          <TextField
            fullWidth
            label="Radius (meters)"
            name="radius"
            type="number"
            value={formData.radius}
            onChange={handleChange}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            select
            label="Trigger Condition"
            name="triggerCondition"
            value={formData.triggerCondition}
            onChange={handleChange}
            margin="normal"
          >
            <MenuItem value="enter">Enter</MenuItem>
            <MenuItem value="exit">Exit</MenuItem>
            <MenuItem value="both">Both</MenuItem>
          </TextField>
          <TextField
            fullWidth
            select
            label="Alert When Item is Low"
            name="alertWhenLow"
            value={formData.alertWhenLow}
            onChange={handleChange}
            margin="normal"
          >
            <MenuItem value={true}>Yes</MenuItem>
            <MenuItem value={false}>No</MenuItem>
          </TextField>

          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            🚨 Smart Alert Settings
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={formData.alertSettings?.leaveWithoutItems || false}
                onChange={handleChange}
                name="alertSettings.leaveWithoutItems"
              />
            }
            label="Alert when leaving without essential items"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={formData.alertSettings?.emailNotifications || false}
                onChange={handleChange}
                name="alertSettings.emailNotifications"
              />
            }
            label="Email notifications"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={formData.alertSettings?.pushNotifications || false}
                onChange={handleChange}
                name="alertSettings.pushNotifications"
              />
            }
            label="Browser notifications"
          />
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            💡 Smart alerts track your GPS location and warn you if you leave this area while monitored items are low or empty
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingGeofence ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default Geofences;
