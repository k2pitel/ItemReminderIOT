const express = require('express');
const { auth } = require('../middleware/auth');
const { io } = require('../index');
const logger = require('../utils/logger');

const router = express.Router();

// Store active location sessions
const locationSessions = new Map();

// Mobile/Phone location update endpoint
router.post('/mobile-location', auth, async (req, res) => {
  try {
    const { latitude, longitude, accuracy, timestamp, source } = req.body;
    const userId = req.userId;

    // Validate location data
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Create location update object
    const locationUpdate = {
      userId,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy: accuracy || 0,
      timestamp: timestamp || new Date().toISOString(),
      source: source || 'mobile-api',
      receivedAt: new Date().toISOString()
    };

    // Store session info
    locationSessions.set(userId, {
      ...locationUpdate,
      lastUpdate: Date.now()
    });

    // Broadcast to connected clients for this user
    if (io) {
      io.emit('mobile-location-update', locationUpdate);
      logger.info(`Mobile location update for user ${userId}:`, locationUpdate);
    }

    res.json({ 
      success: true, 
      message: 'Location updated successfully',
      location: locationUpdate
    });

  } catch (error) {
    logger.error('Mobile location update error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Get current location from mobile session
router.get('/mobile-location', auth, (req, res) => {
  try {
    const userId = req.userId;
    const session = locationSessions.get(userId);

    if (!session) {
      return res.status(404).json({ error: 'No active location session found' });
    }

    // Check if location is recent (within last 5 minutes)
    const age = Date.now() - session.lastUpdate;
    const isRecent = age < 5 * 60 * 1000; // 5 minutes

    res.json({
      location: session,
      age: Math.floor(age / 1000), // age in seconds
      isRecent
    });

  } catch (error) {
    logger.error('Get mobile location error:', error);
    res.status(500).json({ error: 'Failed to get location' });
  }
});

// Share location via simple URL/QR code
router.get('/share/:shareId', async (req, res) => {
  const { shareId } = req.params;
  
  // Simple HTML page for mobile location sharing
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Share Location - ItemReminder</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 400px; 
            margin: 0 auto; 
            padding: 20px; 
            background: #f5f5f5;
        }
        .container { 
            background: white; 
            border-radius: 10px; 
            padding: 20px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        button { 
            width: 100%; 
            padding: 15px; 
            margin: 10px 0; 
            border: none; 
            border-radius: 5px; 
            font-size: 16px; 
            cursor: pointer;
        }
        .primary { background: #2196F3; color: white; }
        .success { background: #4CAF50; color: white; }
        .warning { background: #FF9800; color: white; }
        .info { 
            background: #E3F2FD; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 10px 0;
            border-left: 4px solid #2196F3;
        }
        .status { 
            padding: 10px; 
            margin: 10px 0; 
            border-radius: 5px; 
        }
        .error { background: #FFEBEE; color: #C62828; }
        .success-msg { background: #E8F5E8; color: #2E7D32; }
    </style>
</head>
<body>
    <div class="container">
        <h2>📍 Share Your Location</h2>
        <div class="info">
            <strong>ItemReminder Location Sharing</strong><br>
            Share ID: ${shareId}
        </div>
        
        <button class="primary" onclick="shareLocation()">
            📱 Share Current Location
        </button>
        
        <button class="success" onclick="startContinuousSharing()">
            🔄 Start Continuous Sharing
        </button>
        
        <button class="warning" onclick="stopSharing()">
            ⏹️ Stop Sharing
        </button>
        
        <div id="status" class="status"></div>
        <div id="locationInfo"></div>
    </div>

    <script>
        let watchId = null;
        let isSharing = false;
        
        function updateStatus(message, type = 'info') {
            const status = document.getElementById('status');
            status.className = 'status ' + type;
            status.textContent = message;
        }
        
        function updateLocationInfo(lat, lon, accuracy) {
            const info = document.getElementById('locationInfo');
            info.innerHTML = \`
                <div class="info">
                    <strong>Current Location:</strong><br>
                    Lat: \${lat.toFixed(6)}<br>
                    Lon: \${lon.toFixed(6)}<br>
                    Accuracy: ±\${Math.round(accuracy)}m
                </div>
            \`;
        }
        
        async function sendLocationUpdate(position) {
            try {
                const response = await fetch('/api/location/mobile-location', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: new Date().toISOString(),
                        source: 'mobile-share-${shareId}',
                        shareId: '${shareId}'
                    })
                });
                
                if (response.ok) {
                    updateLocationInfo(
                        position.coords.latitude,
                        position.coords.longitude,
                        position.coords.accuracy
                    );
                    return true;
                } else {
                    throw new Error('Failed to send location');
                }
            } catch (error) {
                console.error('Error sending location:', error);
                return false;
            }
        }
        
        function shareLocation() {
            updateStatus('Getting your location...', 'info');
            
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const success = await sendLocationUpdate(position);
                    if (success) {
                        updateStatus('Location shared successfully! ✅', 'success-msg');
                    } else {
                        updateStatus('Failed to share location ❌', 'error');
                    }
                },
                (error) => {
                    updateStatus('Error getting location: ' + error.message, 'error');
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        }
        
        function startContinuousSharing() {
            if (isSharing) {
                updateStatus('Already sharing location', 'info');
                return;
            }
            
            updateStatus('Starting continuous location sharing...', 'info');
            isSharing = true;
            
            watchId = navigator.geolocation.watchPosition(
                async (position) => {
                    const success = await sendLocationUpdate(position);
                    if (success) {
                        updateStatus('Sharing location continuously ✅ (last: ' + new Date().toLocaleTimeString() + ')', 'success-msg');
                    } else {
                        updateStatus('Error sharing location ❌', 'error');
                    }
                },
                (error) => {
                    updateStatus('Location error: ' + error.message, 'error');
                    stopSharing();
                },
                { 
                    enableHighAccuracy: true, 
                    timeout: 15000, 
                    maximumAge: 30000 
                }
            );
        }
        
        function stopSharing() {
            if (watchId) {
                navigator.geolocation.clearWatch(watchId);
                watchId = null;
            }
            isSharing = false;
            updateStatus('Location sharing stopped', 'warning');
        }
        
        // Auto-request permission when page loads
        if (navigator.geolocation) {
            updateStatus('Ready to share location! 📍', 'success-msg');
        } else {
            updateStatus('Geolocation not supported on this device', 'error');
        }
    </script>
</body>
</html>`;

  res.send(html);
});

// Generate a shareable link for mobile location
router.post('/generate-share-link', auth, (req, res) => {
  try {
    const userId = req.userId;
    const shareId = `share-${userId}-${Date.now().toString(36)}`;
    const shareLink = `${req.protocol}://${req.get('host')}/api/location/share/${shareId}`;
    
    // Store share session
    locationSessions.set(shareId, {
      userId,
      createdAt: new Date().toISOString(),
      type: 'share-link'
    });

    res.json({
      shareId,
      shareLink,
      qrData: shareLink, // Can be used to generate QR code on frontend
      instructions: [
        'Open this link on your phone',
        'Grant location permission when prompted', 
        'Tap "Share Current Location" or "Start Continuous Sharing"',
        'Your location will be sent to the ItemReminder system'
      ]
    });

  } catch (error) {
    logger.error('Generate share link error:', error);
    res.status(500).json({ error: 'Failed to generate share link' });
  }
});

// Manual location entry endpoint
router.post('/manual-location', auth, async (req, res) => {
  try {
    const { address, coordinates } = req.body;
    const userId = req.userId;

    let locationData = {};

    if (coordinates && coordinates.latitude && coordinates.longitude) {
      // Use provided coordinates
      locationData = {
        latitude: parseFloat(coordinates.latitude),
        longitude: parseFloat(coordinates.longitude),
        accuracy: coordinates.accuracy || 1000, // Default 1km accuracy for manual entry
        source: 'manual-coordinates'
      };
    } else if (address) {
      // TODO: Geocode address using a service like OpenCage, Nominatim, etc.
      // For now, return error asking for coordinates
      return res.status(400).json({ 
        error: 'Address geocoding not implemented. Please provide coordinates.' 
      });
    } else {
      return res.status(400).json({ 
        error: 'Either address or coordinates are required' 
      });
    }

    const locationUpdate = {
      userId,
      ...locationData,
      timestamp: new Date().toISOString(),
      source: locationData.source
    };

    // Store and broadcast
    locationSessions.set(userId, {
      ...locationUpdate,
      lastUpdate: Date.now()
    });

    if (io) {
      io.emit('mobile-location-update', locationUpdate);
    }

    res.json({ 
      success: true, 
      message: 'Manual location set successfully',
      location: locationUpdate
    });

  } catch (error) {
    logger.error('Manual location error:', error);
    res.status(500).json({ error: 'Failed to set manual location' });
  }
});

module.exports = router;