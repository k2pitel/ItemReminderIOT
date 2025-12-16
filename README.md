# ItemReminder IoT

A modern, scalable IoT system for smart item tracking with real-time monitoring, geofencing, and intelligent alerts. Built with clean architecture principles using ESP32 sensors, MQTT messaging, Node.js backend, and React frontend.

## 🌟 Key Features

- **Smart Weight Sensing**: ESP32-based HX711 load cell integration with reliable MQTT communication
- **Real-time Updates**: WebSocket-powered live dashboard with sub-second response times
- **Intelligent Geofencing**: Location-based alerts with configurable boundaries and smart notifications
- **Advanced Analytics**: Comprehensive dashboards with trend analysis and predictive insights
- **Multi-tenant Architecture**: Secure user management with JWT authentication and role-based access
- **Robust Notifications**: Email alerts via SMTP with customizable triggers and templates
- **Modern UI/UX**: Responsive Material Design interface optimized for mobile and desktop
- **Production-ready Deployment**: Docker containerization with health checks and resource limits
- **Scalable Infrastructure**: Microservices architecture ready for horizontal scaling

## 🏗️ Architecture

```
ItemReminder IoT/
├── esp32/                  # ESP32 firmware (C++)
│   ├── src/main.cpp       # Main firmware with improved error handling
│   └── platformio.ini     # PlatformIO configuration
├── backend/               # Node.js backend (Clean Architecture)
│   ├── src/
│   │   ├── models/        # MongoDB schemas and validation
│   │   ├── routes/        # Express route handlers
│   │   ├── services/      # Business logic (MQTT, notifications, geofencing)
│   │   ├── socket/        # WebSocket handlers
│   │   ├── middleware/    # Authentication and validation middleware
│   │   └── index.js       # Application entry point
│   ├── package.json       # Dependencies and scripts
│   └── Dockerfile         # Production-ready container
├── frontend/              # React SPA (Modern React patterns)
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page-level components
│   │   ├── context/       # React Context (Auth, Socket)
│   │   └── services/      # API client and utilities
│   ├── package.json
│   └── Dockerfile         # Nginx-based static serving
├── mosquitto/             # MQTT broker configuration
│   └── config/mosquitto.conf
├── docker-compose.yml     # Orchestration with health checks
├── .env.example           # Environment template
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

   **📧 Optional: Setup Email Notifications**
   
   To enable email notifications, configure Gmail SMTP in your `.env` file:
   - SMTP_HOST=smtp.gmail.com
   - SMTP_PORT=587
   - SMTP_USER=your-email@gmail.com
   - SMTP_PASS=your-gmail-app-password (generate at https://myaccount.google.com/apppasswords)

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
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
EMAIL_FROM="IoT Item Reminder <your-email@gmail.com>"
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
    └── Notification Service (Email)
    ↓
Frontend (React)
```

### Data Flow

1. **ESP32** measures weight and publishes to MQTT topic
2. **Backend** subscribes to MQTT, processes data
3. **MongoDB** stores readings and item status
4. **Geofencing Service** checks location-based rules
5. **Notification Service** sends alerts via Email
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
