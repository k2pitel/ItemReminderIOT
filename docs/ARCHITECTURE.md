# IoT Item Reminder - Architecture Documentation

## System Architecture

### Overview

The IoT Item Reminder system is a distributed application consisting of:

1. **IoT Devices (ESP32)**: Edge devices that measure weight and report status
2. **MQTT Broker**: Message broker for pub/sub communication
3. **Backend Server**: Node.js application for business logic and data storage
4. **Database**: MongoDB for persistent storage
5. **Frontend**: React web application for user interaction

### Technology Stack

#### ESP32 Firmware
- **Language**: C++ (Arduino)
- **Libraries**:
  - WiFi: Network connectivity
  - PubSubClient: MQTT client
  - ArduinoJson: JSON serialization
- **Hardware**: ESP32 microcontroller

#### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.IO
- **MQTT**: MQTT.js client
- **Authentication**: JWT (jsonwebtoken)
- **Security**: bcryptjs for password hashing
- **Logging**: Winston
- **Geolocation**: geolib

#### Frontend
- **Framework**: React 18
- **UI Library**: Material-UI (MUI)
- **Routing**: React Router v6
- **Charts**: Recharts
- **Maps**: Leaflet with react-leaflet
- **Real-time**: Socket.IO client
- **HTTP Client**: Axios

#### Infrastructure
- **MQTT Broker**: Eclipse Mosquitto
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx (for production frontend)

## Component Details

### ESP32 Device

**Responsibilities**:
- Simulate weight sensor readings
- Publish data to MQTT broker
- Subscribe to control commands
- Report device status

**MQTT Topics**:
- Publish: `itemreminder/weight` - Weight measurements
- Publish: `itemreminder/status` - Device status
- Subscribe: `itemreminder/command` - Control commands

**Data Format** (Weight):
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

### Backend Server

#### Models

1. **User**: User accounts with authentication
2. **Item**: Tracked items with device association
3. **Reading**: Weight sensor readings (time-series data)
4. **Geofence**: Location-based alert zones
5. **Alert**: Notifications and warnings

#### Services

1. **MQTT Service**: 
   - Connects to MQTT broker
   - Processes incoming weight data
   - Updates item status
   - Triggers alerts

2. **Alert Service**:
   - Creates and manages alerts
   - Triggers notifications

3. **Geofence Service**:
   - Manages geofence zones
   - Checks user location against zones
   - Triggers location-based alerts

4. **Notification Service**:
   - Sends Blynk notifications
   - Sends Firebase push notifications
   - Email notifications (placeholder)

#### API Design

RESTful API with JWT authentication:
- Base URL: `/api`
- Authentication: Bearer token in Authorization header
- Response format: JSON

### Frontend Application

#### Page Structure

1. **Login/Register**: Authentication pages
2. **Dashboard**: Overview of all items
3. **Items**: CRUD operations for items
4. **Analytics**: Charts and statistics
5. **Geofences**: Location-based rules
6. **Alerts**: Notification center
7. **Settings**: User preferences

#### State Management

- **AuthContext**: User authentication state
- **SocketContext**: WebSocket connection
- Component-level state with useState/useEffect

#### Real-time Updates

Socket.IO events:
- `weight_update`: Real-time weight changes
- `status_update`: Device status changes
- `new_alert`: New alert notifications

## Data Flow

### Weight Measurement Flow

1. ESP32 reads weight sensor (simulated)
2. ESP32 publishes to `itemreminder/weight` topic
3. Backend MQTT service receives message
4. Backend updates Item record in MongoDB
5. Backend saves Reading record
6. Backend checks for low weight condition
7. Backend creates Alert if threshold crossed
8. Backend checks geofence rules
9. Backend sends notification via Blynk/Firebase
10. Backend broadcasts update via Socket.IO
11. Frontend receives and displays update

### Geofence Alert Flow

1. User creates geofence zone
2. Backend stores geofence with location and radius
3. When item status changes to LOW:
   - Backend checks active geofences for item
   - If alertWhenLow is enabled, create geofence alert
   - Send notification to user

### User Location Check Flow

1. Frontend sends user location to backend
2. Backend retrieves user's active geofences
3. Backend calculates distance to each geofence center
4. Backend returns list of nearby geofences
5. Frontend displays results

## Security Considerations

### Authentication & Authorization

- JWT tokens with 7-day expiration
- Password hashing with bcrypt (10 rounds)
- Protected routes with authentication middleware
- Role-based access (user/admin)

### Data Security

- CORS enabled for frontend origin only
- Input validation on all endpoints
- MongoDB injection prevention via Mongoose
- Environment variables for sensitive config

### MQTT Security

- Currently uses anonymous access (development)
- Production should use:
  - Username/password authentication
  - TLS/SSL encryption
  - Access control lists (ACLs)

## Scalability

### Current Design

- Single backend server
- Single MongoDB instance
- Single MQTT broker

### Scaling Strategies

1. **Horizontal Scaling**:
   - Load balancer for multiple backend instances
   - MongoDB replica sets
   - Redis for session storage
   - MQTT broker clustering

2. **Vertical Scaling**:
   - Increase server resources
   - MongoDB sharding for large datasets

3. **Optimization**:
   - Database indexing (already implemented)
   - TTL indexes for automatic data cleanup
   - Caching with Redis
   - CDN for frontend assets

## Monitoring & Maintenance

### Logging

- Winston logger in backend
- Log levels: error, warn, info, debug
- Log files: error.log, combined.log
- Console logging in development

### Database Maintenance

- Automatic cleanup via TTL indexes:
  - Readings: 90 days
  - Alerts: 30 days
- Regular backups recommended

### Performance Metrics

Key metrics to monitor:
- MQTT message rate
- Database query performance
- WebSocket connection count
- API response times
- Memory usage

## Deployment

### Development

```bash
# Start MongoDB
mongod

# Start MQTT broker
mosquitto -c mosquitto/config/mosquitto.conf

# Start backend
cd backend && npm run dev

# Start frontend
cd frontend && npm start
```

### Production (Docker)

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Environment Configuration

Separate `.env` files for:
- Backend: database, MQTT, JWT, notifications
- Frontend: API endpoints

Use different values for development, staging, production.

## Future Enhancements

1. **Mobile App**: React Native or Flutter app
2. **Advanced Analytics**: ML-based predictions
3. **Multi-device Support**: Multiple sensors per item
4. **Voice Integration**: Alexa/Google Home
5. **Bluetooth**: Direct ESP32-to-phone communication
6. **Image Recognition**: Camera-based item detection
7. **Sharing**: Share items with family members
8. **Shopping Lists**: Auto-generate based on low items
9. **API Rate Limiting**: Prevent abuse
10. **GraphQL**: Alternative to REST API
