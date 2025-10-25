# ItemReminderIOT

An ESP32 + MQTT + Node.js + MongoDB + React system for tracking items (e.g., medications, groceries) with geofencing and real-time alerts. ESP32 simulates a weight sensor publishing via MQTT. Backend stores data, checks geofence rules, and sends Blynk/Firebase notifications. Frontend shows live status, trends, and analytics. Secure, scalable, multi-user design for smart, location-aware reminders.

## 🌟 Features

- **ESP32 Weight Sensor Simulation**: Simulates weight measurements and publishes data via MQTT
- **Real-time Monitoring**: WebSocket-based live updates for item status
- **Geofencing**: Location-based alerts and reminders
- **Analytics Dashboard**: View trends, statistics, and historical data
- **Multi-user Support**: Secure authentication with JWT
- **Notifications**: Blynk and Firebase Cloud Messaging integration
- **Responsive UI**: Material-UI based React frontend
- **Docker Support**: Easy deployment with Docker Compose

## 📁 Project Structure

```
ItemReminderIOT/
├── esp32/                  # ESP32 firmware
│   ├── item_reminder.ino  # Main Arduino sketch
│   └── README.md          # ESP32 setup instructions
├── backend/               # Node.js backend
│   ├── src/
│   │   ├── models/        # MongoDB models
│   │   ├── routes/        # Express routes
│   │   ├── services/      # Business logic (MQTT, notifications, geofencing)
│   │   ├── middleware/    # Authentication middleware
│   │   └── index.js       # Server entry point
│   ├── package.json
│   └── Dockerfile
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context (Auth, Socket)
│   │   └── services/      # API service
│   ├── package.json
│   └── Dockerfile
├── mosquitto/             # MQTT broker configuration
│   └── config/
│       └── mosquitto.conf
├── docker-compose.yml     # Docker orchestration
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB 6+
- MQTT Broker (Mosquitto)
- Arduino IDE (for ESP32)
- Docker & Docker Compose (optional)

### Option 1: Docker Deployment (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/k2pitel/ItemReminderIOT.git
   cd ItemReminderIOT
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - MQTT Broker: localhost:1883

### Option 2: Manual Setup

#### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB and MQTT broker**
   ```bash
   # Start MongoDB
   mongod

   # Start Mosquitto in another terminal
   mosquitto -c mosquitto/config/mosquitto.conf
   ```

5. **Run backend server**
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

#### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env if needed
   ```

4. **Start development server**
   ```bash
   npm start
   ```

#### ESP32 Setup

See [esp32/README.md](esp32/README.md) for detailed ESP32 setup instructions.

## 📖 Usage Guide

### 1. Create an Account

- Navigate to http://localhost:3000
- Click "Register" and create a new account
- Login with your credentials

### 2. Add Items

- Go to "Items" page
- Click "Add Item"
- Configure:
  - **Device ID**: Unique identifier for your ESP32 device
  - **Name**: Item name (e.g., "Medicine Box")
  - **Category**: Type of item
  - **Threshold Weight**: Minimum acceptable weight
  - **Unit**: Measurement unit

### 3. Configure ESP32

- Update WiFi credentials in `esp32/item_reminder.ino`
- Set MQTT broker address
- Set device ID to match the item you created
- Upload to ESP32

### 4. Set Up Geofences

- Go to "Geofences" page
- Click "Add Geofence"
- Click on map to set location
- Configure radius and trigger conditions
- Enable alerts when item is low

### 5. Monitor & Analytics

- **Dashboard**: Real-time view of all items
- **Analytics**: View trends and statistics
- **Alerts**: Check notifications and warnings

## 🔧 Configuration

### Backend Environment Variables

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/itemreminder
MQTT_BROKER=mqtt://localhost:1883
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
BLYNK_TOKEN=your-blynk-token
FIREBASE_SERVER_KEY=your-firebase-key
```

### Frontend Environment Variables

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

## 🏗️ Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    IoT Item Reminder System Architecture                 │
└──────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │  User Device    │
                    │  Web Browser    │
                    │  (React App)    │
                    └────────┬────────┘
                             │
                             │ HTTPS/WSS
                             │ (Real-time updates)
                             ▼
    ┌──────────────┐   ┌────────────────────┐   ┌──────────────────┐
    │   ESP32      │   │   Backend Server   │   │  Notification    │
    │   Device     │──▶│   (Node.js)        │──▶│  Services        │
    │              │   │                    │   │  - Blynk         │
    │  - Weight    │   │  - REST API        │   │  - Firebase FCM  │
    │    Sensor    │   │  - MQTT Client     │   │  - Email         │
    │  - WiFi      │   │  - Socket.IO       │   └──────────────────┘
    │  - MQTT Pub  │   │  - Auth (JWT)      │
    └──────┬───────┘   │  - Business Logic  │
           │           └─────────┬──────────┘
           │                     │
           │ MQTT                │ Mongoose ODM
           │ Protocol            │
           │                     ▼
           │           ┌──────────────────┐
           │           │    MongoDB       │
           │           │                  │
           └──────────▶│  - Users         │
                       │  - Items         │
         ┌─────────────│  - Readings      │
         │             │  - Geofences     │
         │             │  - Alerts        │
         ▼             └──────────────────┘
    ┌──────────┐
    │  MQTT    │
    │  Broker  │
    │(Mosquitto)│
    └──────────┘

Key Components:
══════════════
• ESP32: IoT edge device with weight sensor simulation
• MQTT Broker: Message broker for pub/sub communication  
• Backend: Node.js server with Express.js REST API
• MongoDB: NoSQL database for data persistence
• Frontend: React SPA with Material-UI
• Notifications: Multi-channel alert system
```

### Data Flow

1. **ESP32** measures weight and publishes to MQTT topic (`itemreminder/weight`)
2. **MQTT Broker** routes messages to subscribed clients
3. **Backend** subscribes to MQTT, processes weight data
4. **MongoDB** stores readings and updates item status
5. **Geofencing Service** checks location-based rules
6. **Alert Service** creates alerts when thresholds are crossed
7. **Notification Service** sends alerts via Blynk/Firebase/Email
8. **Socket.IO** broadcasts real-time updates to connected frontends
9. **Frontend** displays live data, charts, and visualizations

### Key Features Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                             │
│                                                                  │
│  Dashboard │ Items │ Analytics │ Geofences │ Alerts │ Settings  │
│                                                                  │
│  AuthContext ────────────── SocketContext                        │
└────────────────────────┬────────────────────────────────────────┘
                         │ REST API + WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js)                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Routes: auth │ items │ readings │ geofence │ alerts    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Services:                                                │   │
│  │  • mqttService - MQTT communication & processing         │   │
│  │  • alertService - Alert creation & management            │   │
│  │  • geofenceService - Location-based logic                │   │
│  │  • notificationService - Multi-channel notifications     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Models: User │ Item │ Reading │ Geofence │ Alert        │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │ Mongoose
                         ▼
                  ┌──────────────┐
                  │   MongoDB    │
                  └──────────────┘
```

## 📡 API Endpoints

The backend exposes a RESTful API with 20 endpoints across 6 route groups:

### Authentication (2 endpoints)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### Items (5 endpoints)
- `GET /api/items` - Get all user's items
- `GET /api/items/:id` - Get specific item
- `POST /api/items` - Create new item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

### Readings (2 endpoints)
- `GET /api/readings/item/:itemId` - Get readings for item (with pagination)
- `GET /api/readings/analytics/:itemId` - Get analytics and statistics

### Geofences (5 endpoints)
- `GET /api/geofence` - Get all user's geofences
- `POST /api/geofence` - Create geofence
- `PUT /api/geofence/:id` - Update geofence
- `DELETE /api/geofence/:id` - Delete geofence
- `POST /api/geofence/check-location` - Check user location against geofences

### Alerts (3 endpoints)
- `GET /api/alerts` - Get user's alerts
- `PATCH /api/alerts/:id/read` - Mark alert as read
- `DELETE /api/alerts/:id` - Delete alert

### Users (3 endpoints)
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update user profile
- `PUT /api/users/me/notifications` - Update notification preferences

**Note**: All endpoints except `/api/auth/register` and `/api/auth/login` require JWT authentication via Bearer token in the Authorization header.

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS protection
- Input validation
- Role-based access control
- Secure MongoDB connections

## 📊 Monitoring & Logging

- Winston logger for backend
- Console logging for frontend
- MongoDB TTL indexes for auto-cleanup
- Real-time status monitoring

## 🐛 Troubleshooting

### Backend won't start
- Check MongoDB is running
- Verify MQTT broker is accessible
- Check .env configuration

### Frontend can't connect
- Verify backend is running
- Check CORS settings
- Verify API URL in .env

### ESP32 not publishing
- Check WiFi credentials
- Verify MQTT broker address
- Check serial monitor for errors

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📚 Documentation

Comprehensive documentation is available:

- **[README.md](README.md)** - Main project overview and quick start
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture with detailed diagrams
- **[FEATURES.md](docs/FEATURES.md)** - Complete feature list and technology stack
- **[QUICKSTART.md](docs/QUICKSTART.md)** - 5-minute getting started guide
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Production deployment guide
- **[DIAGRAMS.md](docs/DIAGRAMS.md)** - Index of all diagrams in the project
- **[SUMMARY.md](SUMMARY.md)** - Implementation summary and project metrics
- **[esp32/README.md](esp32/README.md)** - ESP32 hardware setup and firmware guide

### Diagram Resources

The project includes comprehensive visual diagrams:
- **C4 Container-level (C2) diagrams** - System architecture
- **UML Class diagrams** - Data models and relationships
- **Sequence diagrams** - Data flows and interactions
- **Block diagrams** - Component organization
- **Hardware wiring diagrams** - ESP32 setup
- **Deployment diagrams** - Infrastructure and scaling

See [DIAGRAMS.md](docs/DIAGRAMS.md) for a complete index of all diagrams.

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

- Created for IoT Item Reminder project

## 🙏 Acknowledgments

- ESP32 Arduino framework
- MQTT.js and Mosquitto
- Express.js and Socket.IO
- React and Material-UI
- MongoDB and Mongoose
- Leaflet for maps
- Recharts for analytics
