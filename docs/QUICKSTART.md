# Quick Start Guide

## What is IoT Item Reminder?

An end-to-end IoT system for tracking items (medications, groceries, supplies) with:
- **Smart Monitoring**: ESP32 weight sensors track item levels
- **Real-time Alerts**: Get notified when items run low
- **Geofencing**: Location-aware reminders
- **Analytics**: View trends and consumption patterns
- **Multi-user**: Secure accounts for multiple users

## Getting Started in 5 Minutes

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/k2pitel/ItemReminderIOT.git
cd ItemReminderIOT

# Start all services
docker-compose up -d

# Open in browser
# http://localhost:3000
```

That's it! The system is running with:
- Frontend at http://localhost:3000
- Backend API at http://localhost:5000
- MQTT broker at localhost:1883
- MongoDB at localhost:27017

### Option 2: Manual Setup

**Backend:**
```bash
cd backend
npm install
cp .env.example .env
npm start
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.example .env
npm start
```

**Services:**
- Start MongoDB: `mongod`
- Start Mosquitto: `mosquitto -c mosquitto/config/mosquitto.conf`

## First Steps

1. **Register Account**
   - Go to http://localhost:3000
   - Click "Register"
   - Create your account

2. **Add Your First Item**
   - Navigate to "Items" page
   - Click "Add Item"
   - Enter details:
     - Device ID: e.g., "DEVICE_001"
     - Name: e.g., "Medicine Box"
     - Threshold: e.g., 10 grams
   - Save

3. **Configure ESP32** (Optional)
   - See `esp32/README.md` for setup
   - Update WiFi and MQTT settings
   - Upload to your ESP32
   - Device will start sending data

4. **Set Up Geofence** (Optional)
   - Go to "Geofences" page
   - Click "Add Geofence"
   - Select item
   - Click on map to set location
   - Configure radius and alerts

5. **Monitor Your Items**
   - **Dashboard**: Real-time overview
   - **Analytics**: View trends and charts
   - **Alerts**: Check notifications

## System Components

### ESP32 Firmware
- Location: `esp32/item_reminder.ino`
- Simulates weight sensor
- Publishes to MQTT every 5 seconds
- Configurable thresholds

### Backend Server
- Location: `backend/`
- Node.js + Express
- MongoDB for data storage
- MQTT client for sensor data
- Socket.IO for real-time updates
- REST API for frontend

### Frontend Application
- Location: `frontend/`
- React + Material-UI
- Real-time dashboard
- Charts and analytics
- Map-based geofencing
- User settings

### Infrastructure
- MongoDB: Database
- Mosquitto: MQTT broker
- Docker: Containerization
- Nginx: Production web server

## Key Features

### Real-time Monitoring
- Live weight updates
- Status indicators (OK, LOW, OFFLINE)
- WebSocket push notifications

### Analytics
- Historical trends
- Weight charts
- Usage statistics
- Period selection (1d, 7d, 30d, 90d)

### Geofencing
- Create location zones
- Distance-based alerts
- Trigger conditions (enter/exit/both)
- Multiple geofences per item

### Notifications
- Blynk integration
- Firebase Cloud Messaging
- Email notifications (configurable)
- In-app alert center

### Multi-user
- Secure JWT authentication
- User profiles
- Notification preferences
- Role-based access

## Architecture

```
┌─────────────┐
│   ESP32     │ ──(MQTT)──┐
│  (Sensor)   │           │
└─────────────┘           ▼
                    ┌──────────┐
                    │  MQTT    │
                    │  Broker  │
                    └──────────┘
                          │
                          ▼
                    ┌──────────┐     ┌──────────┐
                    │ Backend  │────▶│ MongoDB  │
                    │ (Node.js)│     └──────────┘
                    └──────────┘
                          │
                    (Socket.IO)
                          │
                          ▼
                    ┌──────────┐
                    │ Frontend │
                    │ (React)  │
                    └──────────┘
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login

### Items
- `GET /api/items` - List items
- `POST /api/items` - Create item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

### Analytics
- `GET /api/readings/item/:itemId` - Get readings
- `GET /api/readings/analytics/:itemId` - Get analytics

### Geofences
- `GET /api/geofence` - List geofences
- `POST /api/geofence` - Create geofence
- `POST /api/geofence/check-location` - Check location

### Alerts
- `GET /api/alerts` - List alerts
- `PATCH /api/alerts/:id/read` - Mark as read
- `DELETE /api/alerts/:id` - Delete alert

## Configuration

### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/itemreminder
MQTT_BROKER=mqtt://localhost:1883
JWT_SECRET=your-secret-key
BLYNK_TOKEN=your-blynk-token
FIREBASE_SERVER_KEY=your-firebase-key
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

### ESP32 (item_reminder.ino)
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "YOUR_MQTT_BROKER";
const char* device_id = "DEVICE_001";
```

## Troubleshooting

**Backend won't start:**
- Check MongoDB is running
- Verify MQTT broker is accessible
- Check .env configuration

**Frontend can't connect:**
- Verify backend is running on port 5000
- Check CORS settings
- Verify API URL in .env

**ESP32 not publishing:**
- Check WiFi credentials
- Verify MQTT broker address
- Check serial monitor for errors
- Ensure device_id matches an item

**No real-time updates:**
- Check Socket.IO connection
- Verify WebSocket is not blocked
- Check browser console for errors

## Production Deployment

See `docs/DEPLOYMENT.md` for detailed production deployment guide including:
- SSL/HTTPS setup
- Cloud deployment (AWS, Digital Ocean, Heroku)
- Scaling strategies
- Security hardening
- Monitoring and backups

## Documentation

- `README.md` - This file
- `docs/ARCHITECTURE.md` - System architecture details
- `docs/DEPLOYMENT.md` - Deployment guide
- `esp32/README.md` - ESP32 setup instructions

## Support

For issues or questions:
1. Check documentation
2. Review troubleshooting section
3. Check logs: `docker-compose logs -f`
4. Open GitHub issue

## License

MIT License - See LICENSE file for details
