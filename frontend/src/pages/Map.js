import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  FormControlLabel,
  Switch,
  Alert
} from '@mui/material';
import { MyLocation, Refresh } from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import Layout from '../components/Layout';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom marker icons
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const geofenceIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to recenter map when user location changes
const RecenterMap = ({ center }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  
  return null;
};

const Map = () => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [geofences, setGeofences] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState(null);
  const [error, setError] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [mapCenter, setMapCenter] = useState([55.8826, 9.8431]); // Default center
  const [mapZoom, setMapZoom] = useState(13);

  useEffect(() => {
    fetchGeofences();
    
    // Check if tracking was previously enabled
    const savedTracking = localStorage.getItem('locationTrackingEnabled') === 'true';
    if (savedTracking) {
      setIsTracking(true);
      startTracking();
    }
    
    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!socket || !user) return;

    // Authenticate socket
    socket.emit('authenticate', { userId: user.id });

    // Listen for geofence alerts
    socket.on('geofence-alert', (alert) => {
      if (Notification.permission === 'granted') {
        new Notification(alert.message, {
          icon: '/favicon.ico',
          tag: `geofence-${alert.geofenceName}`
        });
      }
    });

    return () => {
      socket.off('geofence-alert');
    };
  }, [socket, user]);

  const fetchGeofences = async () => {
    try {
      const response = await api.get('/geofence');
      setGeofences(response.data);
      
      // If geofences exist, center map on first one
      if (response.data.length > 0 && !userLocation) {
        const firstGeofence = response.data[0];
        setMapCenter([firstGeofence.location.latitude, firstGeofence.location.longitude]);
      }
    } catch (error) {
      console.error('Error fetching geofences:', error);
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setError(null);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000
    };

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        setUserLocation({ latitude, longitude });
        setAccuracy(accuracy);
        setMapCenter([latitude, longitude]);
        
        // Send location to backend
        if (socket) {
          socket.emit('location-update', {
            latitude,
            longitude,
            accuracy,
            timestamp: new Date().toISOString()
          });
        }
      },
      (error) => {
        setError(`Location error: ${error.message}`);
        setIsTracking(false);
        localStorage.setItem('locationTrackingEnabled', 'false');
      },
      options
    );

    setWatchId(id);
  };

  const stopTracking = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setUserLocation(null);
    setAccuracy(null);
  };

  const handleTrackingToggle = (event) => {
    const enabled = event.target.checked;
    setIsTracking(enabled);
    localStorage.setItem('locationTrackingEnabled', enabled.toString());
    
    if (enabled) {
      startTracking();
    } else {
      stopTracking();
    }
  };

  const centerOnUser = () => {
    if (userLocation) {
      setMapCenter([userLocation.latitude, userLocation.longitude]);
      setMapZoom(15);
    }
  };

  const getGeofenceColor = (geofence) => {
    // Color based on trigger condition
    switch (geofence.triggerCondition) {
      case 'enter': return 'green';
      case 'exit': return 'orange';
      case 'both': return 'red';
      default: return 'blue';
    }
  };

  return (
    <Layout>
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Live Map
        </Typography>
        
        <FormControlLabel
          control={
            <Switch
              checked={isTracking}
              onChange={handleTrackingToggle}
              color="primary"
            />
          }
          label="Track My Location"
        />
        
        <IconButton 
          color="primary" 
          onClick={centerOnUser}
          disabled={!userLocation}
          title="Center on my location"
        >
          <MyLocation />
        </IconButton>
        
        <IconButton 
          color="primary" 
          onClick={fetchGeofences}
          title="Refresh geofences"
        >
          <Refresh />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Card sx={{ minWidth: 200 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Geofences
            </Typography>
            <Typography variant="h5">
              {geofences.length}
            </Typography>
          </CardContent>
        </Card>

        {userLocation && (
          <Card sx={{ minWidth: 250 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Your Location
              </Typography>
              <Typography variant="body1">
                {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
              </Typography>
              {accuracy && (
                <Typography variant="caption" color="text.secondary">
                  Accuracy: ±{Math.round(accuracy)}m
                </Typography>
              )}
            </CardContent>
          </Card>
        )}

        {isTracking && (
          <Card sx={{ minWidth: 150 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Tracking Status
              </Typography>
              <Chip label="Active" color="success" size="small" />
            </CardContent>
          </Card>
        )}
      </Box>

      <Box sx={{ height: 'calc(100vh - 300px)', minHeight: '500px', position: 'relative' }}>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%', borderRadius: '8px' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          <RecenterMap center={mapCenter} />

          {/* User location marker */}
          {userLocation && (
            <Marker 
              position={[userLocation.latitude, userLocation.longitude]}
              icon={userIcon}
            >
              <Popup>
                <strong>You are here</strong>
                <br />
                Lat: {userLocation.latitude.toFixed(6)}
                <br />
                Lng: {userLocation.longitude.toFixed(6)}
                {accuracy && (
                  <>
                    <br />
                    Accuracy: ±{Math.round(accuracy)}m
                  </>
                )}
              </Popup>
            </Marker>
          )}

          {/* Geofence markers and circles */}
          {geofences.map((geofence) => (
            <React.Fragment key={geofence._id}>
              <Marker
                position={[geofence.location.latitude, geofence.location.longitude]}
                icon={geofenceIcon}
              >
                <Popup>
                  <strong>{geofence.name}</strong>
                  <br />
                  Item: {geofence.itemId?.name || 'N/A'}
                  <br />
                  Radius: {geofence.radius}m
                  <br />
                  Trigger: <Chip label={geofence.triggerCondition} size="small" />
                  <br />
                  Alert when low: {geofence.alertWhenLow ? 'Yes' : 'No'}
                </Popup>
              </Marker>
              
              <Circle
                center={[geofence.location.latitude, geofence.location.longitude]}
                radius={geofence.radius}
                pathOptions={{
                  color: getGeofenceColor(geofence),
                  fillColor: getGeofenceColor(geofence),
                  fillOpacity: 0.15,
                  weight: 2
                }}
              />
            </React.Fragment>
          ))}
        </MapContainer>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Legend: Blue marker = You | Red markers = Geofences | 
          Green circles = Enter trigger | Orange circles = Exit trigger | Red circles = Both triggers
        </Typography>
      </Box>
    </Layout>
  );
};

export default Map;
