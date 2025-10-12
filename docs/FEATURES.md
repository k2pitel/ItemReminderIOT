# System Features Overview

## Core Features

### 1. Real-time Item Monitoring
- **Weight Tracking**: Continuous monitoring via ESP32 sensors
- **Status Updates**: Live status (OK, LOW, EMPTY, OFFLINE)
- **WebSocket Push**: Instant updates to all connected clients
- **Visual Indicators**: Color-coded status displays
- **Progress Bars**: Visual weight level representation

### 2. Smart Alerts & Notifications
- **Low Weight Alerts**: Automatic notifications when items run low
- **Offline Detection**: Alert when devices disconnect
- **Geofence Alerts**: Location-based reminders
- **Multi-channel**: Blynk, Firebase, Email notifications
- **Alert History**: Track all past notifications
- **Read/Unread**: Mark alerts as read

### 3. Geofencing
- **Interactive Maps**: Leaflet-based location selection
- **Custom Zones**: Set radius for each geofence
- **Trigger Conditions**: Enter, Exit, or Both
- **Item Association**: Link geofences to specific items
- **Distance Calculation**: Real-time distance to zones
- **Conditional Alerts**: Alert only when item is low

### 4. Analytics & Trends
- **Historical Data**: View readings over time
- **Trend Charts**: Line and bar charts with Recharts
- **Statistics**: Min, Max, Average calculations
- **Time Periods**: 1d, 7d, 30d, 90d views
- **Data Grouping**: Hourly or daily aggregation
- **Export Ready**: JSON data available via API

### 5. Multi-user System
- **User Accounts**: Individual user profiles
- **Authentication**: JWT-based secure login
- **Password Security**: bcrypt hashing
- **User Settings**: Customizable preferences
- **Notification Preferences**: Per-user controls
- **Role-based Access**: User and Admin roles

### 6. Device Management
- **Multiple Items**: Track unlimited items
- **Device Registration**: Link ESP32 devices to items
- **Categories**: Medication, Grocery, Supply, Other
- **Custom Names**: User-defined item names
- **Units**: Support for grams, kg, oz, lbs
- **Threshold Config**: Customizable low-level warnings

## Technical Features

### Security
- ✅ JWT token authentication
- ✅ Password hashing (bcrypt)
- ✅ CORS protection
- ✅ Input validation
- ✅ Secure HTTP headers
- ✅ Environment-based secrets

### Scalability
- ✅ Horizontal scaling ready
- ✅ Database indexing
- ✅ TTL indexes for auto-cleanup
- ✅ Connection pooling
- ✅ Stateless backend design
- ✅ Docker containerization

### Performance
- ✅ WebSocket for real-time updates
- ✅ Database query optimization
- ✅ Efficient MQTT handling
- ✅ React optimization
- ✅ Lazy loading components
- ✅ Production builds

### Reliability
- ✅ Error handling
- ✅ Logging (Winston)
- ✅ Health check endpoints
- ✅ Automatic reconnection
- ✅ Data persistence
- ✅ Graceful degradation

### Developer Experience
- ✅ Environment configuration
- ✅ Docker Compose setup
- ✅ Hot reload in development
- ✅ Comprehensive documentation
- ✅ Clean code structure
- ✅ RESTful API design

## Data Models

### User
```javascript
{
  username: String,
  email: String,
  password: String (hashed),
  firstName: String,
  lastName: String,
  role: 'user' | 'admin',
  notifications: {
    email: Boolean,
    push: Boolean,
    sms: Boolean
  }
}
```

### Item
```javascript
{
  userId: ObjectId,
  deviceId: String,
  name: String,
  description: String,
  category: 'medication' | 'grocery' | 'supply' | 'other',
  thresholdWeight: Number,
  currentWeight: Number,
  unit: 'grams' | 'kg' | 'oz' | 'lbs',
  status: 'OK' | 'LOW' | 'EMPTY' | 'OFFLINE',
  lastReading: Date
}
```

### Reading
```javascript
{
  itemId: ObjectId,
  deviceId: String,
  weight: Number,
  threshold: Number,
  status: 'OK' | 'LOW',
  wifiRssi: Number,
  timestamp: Date
}
```

### Geofence
```javascript
{
  userId: ObjectId,
  itemId: ObjectId,
  name: String,
  location: {
    latitude: Number,
    longitude: Number
  },
  radius: Number,
  triggerCondition: 'enter' | 'exit' | 'both',
  alertWhenLow: Boolean
}
```

### Alert
```javascript
{
  userId: ObjectId,
  itemId: ObjectId,
  type: 'low_weight' | 'offline' | 'geofence',
  severity: 'info' | 'warning' | 'critical',
  message: String,
  data: Object,
  read: Boolean,
  notificationSent: Boolean,
  createdAt: Date
}
```

## MQTT Topics

### Published by ESP32
- `itemreminder/weight` - Weight measurements
  ```json
  {
    "device_id": "DEVICE_001",
    "item_name": "Medicine Box",
    "weight": 125.5,
    "threshold": 10.0,
    "status": "OK",
    "timestamp": 1234567890,
    "wifi_rssi": -45
  }
  ```

- `itemreminder/status` - Device status
  ```json
  {
    "device_id": "DEVICE_001",
    "status": "online",
    "ip": "192.168.1.100",
    "timestamp": 1234567890
  }
  ```

### Subscribed by ESP32
- `itemreminder/command` - Control commands
  ```json
  {
    "threshold": 15.0
  }
  ```

## WebSocket Events

### Client → Server
- `connection` - Client connected
- `disconnect` - Client disconnected

### Server → Client
- `weight_update` - Real-time weight change
  ```json
  {
    "itemId": "507f1f77bcf86cd799439011",
    "deviceId": "DEVICE_001",
    "weight": 125.5,
    "status": "OK",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

- `status_update` - Device status change
  ```json
  {
    "itemId": "507f1f77bcf86cd799439011",
    "deviceId": "DEVICE_001",
    "status": "OFFLINE",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

## Frontend Pages

1. **Login** (`/login`)
   - User authentication
   - Email/username login
   - Link to registration

2. **Register** (`/register`)
   - Account creation
   - Profile information
   - Password validation

3. **Dashboard** (`/`)
   - Item overview cards
   - Status summary
   - Real-time updates
   - Quick statistics

4. **Items** (`/items`)
   - Item list table
   - Add/Edit/Delete items
   - Device configuration
   - Status indicators

5. **Analytics** (`/analytics`)
   - Item selector
   - Time period selector
   - Trend charts
   - Statistics cards
   - Data visualization

6. **Geofences** (`/geofences`)
   - Geofence list
   - Interactive map
   - Create/Edit zones
   - Location picker

7. **Alerts** (`/alerts`)
   - Alert list
   - Mark as read
   - Filter by type
   - Alert details

8. **Settings** (`/settings`)
   - Profile editing
   - Notification preferences
   - Account information
   - About section

## Technology Stack Summary

### Frontend
- React 18
- Material-UI 5
- React Router 6
- Socket.IO Client
- Axios
- Recharts
- Leaflet
- React-Leaflet

### Backend
- Node.js 18
- Express.js
- MongoDB
- Mongoose
- MQTT.js
- Socket.IO
- JWT
- bcryptjs
- Winston
- geolib

### Infrastructure
- Docker
- Docker Compose
- Mosquitto MQTT
- MongoDB 6
- Nginx

### Development
- Nodemon
- React Scripts
- ESLint
- Git
