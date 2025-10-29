import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Inventory as ItemsIcon,
  Analytics as AnalyticsIcon,
  Place as GeofenceIcon,
  Map as MapIcon,
  Notifications as AlertsIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';

const Layout = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    ok: 0,
    low: 0,
    offline: 0
  });
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('weight_update', handleWeightUpdate);
      socket.on('status_update', handleStatusUpdate);

      return () => {
        socket.off('weight_update');
        socket.off('status_update');
      };
    }
  }, [socket]);

  const fetchItems = async () => {
    try {
      const response = await api.get('/items');
      setItems(response.data);
      calculateStats(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const calculateStats = (itemsList) => {
    const stats = {
      total: itemsList.length,
      ok: 0,
      low: 0,
      offline: 0
    };

    itemsList.forEach(item => {
      if (item.status === 'OK') stats.ok++;
      else if (item.status === 'LOW' || item.status === 'EMPTY') stats.low++;
      else if (item.status === 'OFFLINE') stats.offline++;
    });

    setStats(stats);
  };

  const handleWeightUpdate = (data) => {
    setItems(prevItems => {
      const newItems = prevItems.map(item =>
        item._id === data.itemId
          ? { ...item, currentWeight: data.weight, status: data.status }
          : item
      );
      calculateStats(newItems);
      return newItems;
    });
  };

  const handleStatusUpdate = (data) => {
    setItems(prevItems => {
      const newItems = prevItems.map(item =>
        item._id === data.itemId
          ? { ...item, status: data.status }
          : item
      );
      calculateStats(newItems);
      return newItems;
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Items', icon: <ItemsIcon />, path: '/items' },
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
    { text: 'Geofences', icon: <GeofenceIcon />, path: '/geofences' },
    { text: 'Map', icon: <MapIcon />, path: '/map' },
    { text: 'Alerts', icon: <AlertsIcon />, path: '/alerts' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' }
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            IoT Item Reminder
          </Typography>
          <Typography variant="body1" sx={{ mr: 2 }}>
            {user?.username}
          </Typography>
          <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 250 }}>
          <List>
            {menuItems.map((item) => (
              <ListItem
                button
                key={item.text}
                selected={location.pathname === item.path}
                onClick={() => {
                  navigate(item.path);
                  setDrawerOpen(false);
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flex: 1 }}>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Items
                </Typography>
                <Typography variant="h4">{stats.total}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Status: OK
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats.ok}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Status: Low
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {stats.low}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Offline
                </Typography>
                <Typography variant="h4" color="error.main">
                  {stats.offline}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {children}
      </Container>
    </Box>
  );
};

export default Layout;
