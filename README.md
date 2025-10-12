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
ESP32 Device
    ↓ (MQTT)
MQTT Broker (Mosquitto)
    ↓
Backend Server (Node.js)
    ├── MongoDB (Data Storage)
    ├── Socket.IO (Real-time Updates)
    └── Notification Services (Blynk/Firebase)
    ↓
Frontend (React)
```

### Data Flow

1. **ESP32** measures weight and publishes to MQTT topic
2. **Backend** subscribes to MQTT, processes data
3. **MongoDB** stores readings and item status
4. **Geofencing Service** checks location-based rules
5. **Notification Service** sends alerts via Blynk/Firebase
6. **Socket.IO** broadcasts real-time updates to frontend
7. **Frontend** displays live data and visualizations

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login

### Items
- `GET /api/items` - Get all items
- `POST /api/items` - Create item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

### Readings
- `GET /api/readings/item/:itemId` - Get readings for item
- `GET /api/readings/analytics/:itemId` - Get analytics

### Geofences
- `GET /api/geofence` - Get geofences
- `POST /api/geofence` - Create geofence
- `PUT /api/geofence/:id` - Update geofence
- `DELETE /api/geofence/:id` - Delete geofence
- `POST /api/geofence/check-location` - Check user location

### Alerts
- `GET /api/alerts` - Get alerts
- `PATCH /api/alerts/:id/read` - Mark alert as read
- `DELETE /api/alerts/:id` - Delete alert

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
