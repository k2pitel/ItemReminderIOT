import React, { useState, useEffect, useCallback } from 'react';
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
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';

const Layout = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
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

  const calculateStats = useCallback((itemsList) => {
    const newStats = {
      total: itemsList.length,
      ok: 0,
      low: 0,
      offline: 0
    };

    itemsList.forEach(item => {
      if (item.status === 'OK') newStats.ok++;
      else if (item.status === 'LOW' || item.status === 'EMPTY') newStats.low++;
      else if (item.status === 'OFFLINE') newStats.offline++;
    });

    setStats(newStats);
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const response = await api.get('/items');
      calculateStats(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  }, [calculateStats]);

  const handleWeightUpdate = useCallback((data) => {
    // Refetch items to update stats when weight changes
    fetchItems();
  }, [fetchItems]);

  const handleStatusUpdate = useCallback((data) => {
    // Refetch items to update stats when status changes
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (socket) {
      socket.on('weight_update', handleWeightUpdate);
      socket.on('status_update', handleStatusUpdate);

      return () => {
        socket.off('weight_update');
        socket.off('status_update');
      };
    }
  }, [socket, handleWeightUpdate, handleStatusUpdate]);

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
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          bgcolor: 'white',
          color: 'text.primary'
        }}
      >
        <Toolbar sx={{ minHeight: 64 }}>
          <IconButton
            edge="start"
            sx={{ mr: 2 }}
            onClick={() => setDrawerOpen(true)}
          >
            <MenuIcon />
          </IconButton>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '6px',
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 1.5
            }}
          >
            <Typography variant="h6" sx={{ color: 'white', fontSize: '1.125rem', fontWeight: 600 }}>S</Typography>
          </Box>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 500, fontSize: '1rem' }}>
            Smart Tracker
          </Typography>
          <Typography variant="body2" sx={{ mr: 2, color: 'text.secondary' }}>
            {user?.username}
          </Typography>
          <Button 
            onClick={handleLogout} 
            size="small"
            sx={{ color: 'text.secondary' }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer 
        open={drawerOpen} 
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 260,
            bgcolor: 'white',
            borderRight: '1px solid #e5e7eb'
          }
        }}
      >
        <Box sx={{ p: 3, borderBottom: '1px solid #e5e7eb' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '6px',
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2
              }}
            >
              <Typography variant="h5" sx={{ color: 'white', fontWeight: 600 }}>S</Typography>
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 500, fontSize: '1rem' }}>Smart Tracker</Typography>
              <Typography variant="caption" color="text.secondary">IoT Management</Typography>
            </Box>
          </Box>
        </Box>
        <List sx={{ px: 1, py: 2 }}>
          {menuItems.map((item) => (
            <ListItem
              button
              key={item.text}
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                setDrawerOpen(false);
              }}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                '&.Mui-selected': {
                  bgcolor: 'grey.100',
                  '&:hover': {
                    bgcolor: 'grey.200'
                  }
                },
                '&:hover': {
                  bgcolor: 'grey.50'
                }
              }}
            >
              <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'text.secondary', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{ 
                  fontSize: '0.875rem',
                  fontWeight: location.pathname === item.path ? 500 : 400 
                }}
              />
            </ListItem>
          ))}
        </List>
      </Drawer>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flex: 1 }}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Total
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  {stats.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  OK
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
                  {stats.ok}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Low
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'warning.main' }}>
                  {stats.low}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Offline
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'error.main' }}>
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
