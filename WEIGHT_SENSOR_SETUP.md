# Weight Sensor Integration Guide

## Overview
Your Item Reminder application now fully integrates with the ESP32 weight sensor. Real weight data flows from the sensor through MQTT to the backend, then to the frontend via Socket.io.

## Data Flow Architecture

```
ESP32 HX711 Sensor
    ↓ (MQTT: itemreminder/devices/{deviceId}/weight)
Mosquitto MQTT Broker
    ↓ (MQTT Subscribe)
Backend (Node.js + Express)
    ├→ Save to MongoDB (Item.currentWeight, Reading)
    ├→ Broadcast via Socket.io (weight_update event)
    └→ REST API endpoints
    ↓ (Socket.io + HTTP)
Frontend (React)
    ├→ Real-time updates (Socket.io listener)
    ├→ Polling fallback (every 10 seconds)
    └→ Display in Dashboard & Analytics
```

## Prerequisites

### 1. ESP32 Configuration
Your ESP32 must be programmed with the firmware in `esp32/src/main.cpp`. Key settings:

```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "10.133.56.122";  // Your MQTT broker IP
const char* device_id = "ESP32_001";        // Must match backend item deviceId
const char* item_name = "Pills";            // Item name for reference
const bool MQTT_ENABLED = true;             // ⚠️ MUST BE TRUE for production
```

### 2. Backend Configuration
Create/update `backend/.env`:

```
MQTT_BROKER=mqtt://mosquitto:1883
MQTT_USER=
MQTT_PASSWORD=
MONGODB_URI=mongodb://mongodb:27017/itemreminder
```

### 3. Frontend Configuration
No additional setup needed — already configured to listen for weight updates.

## Setting Up an Item

1. **Create an Item in the web app:**
   - Name: "Pills" (or your item name)
   - Device ID: "ESP32_001" (must match ESP32 firmware)
   - Threshold Weight: 1000g (or your target weight)
   - Unit: grams
   - Detection Mode: weight
   - Enable Notifications: true

2. **Verify Device Connection:**
   - Backend logs should show:
     ```
     [MQTT] Subscribed to itemreminder/devices/ESP32_001/weight
     ```
   - Dashboard should show item with current weight (initially 0g until sensor sends data)

## Real-Time Data Updates

### Socket.io Connection
The frontend automatically:
- ✅ Connects to backend Socket.io when authenticated
- ✅ Listens for `weight_update` events
- ✅ Updates item weight in real-time
- ✅ Polls every 10 seconds as fallback

### Weight Sensor Readings
The ESP32 publishes MQTT messages on interval:

```json
{
  "device_id": "ESP32_001",
  "item_name": "Pills",
  "weight": 245.5,
  "threshold": 1000,
  "status": "OK",
  "wifi_rssi": -65,
  "unit": "grams",
  "uptime": 3600,
  "free_heap": 125000
}
```

**Frequency:** Every 2 seconds (configurable in firmware)

### Status Values
- `OK`: Weight ≥ threshold
- `LOW`: Weight < threshold but > 0
- `EMPTY`: Weight ≤ 0

## Features Enabled

### Dashboard View
- **Weight Display:** Shows current weight in grams
- **Status Badge:** OK (green), LOW (yellow), EMPTY (red)
- **Progress Bar:** Visual representation of weight vs threshold
- **Last Updated:** Timestamp of last reading
- **Real-time Updates:** Updates as sensor readings arrive

### Analytics Page
- **Weight History:** Line chart of weight over time
- **Statistics:** Min, max, average weight for selected period
- **Trend Analysis:** 7-day, 30-day, or 90-day views
- **Data Source:** All readings stored in MongoDB

### Alerts & Notifications
When weight drops below threshold:
- Backend creates an alert in MongoDB
- Frontend receives notification
- Custom alert messages supported

## Testing the Integration

### 1. Start All Services
```powershell
docker compose up -d
```

Verify all containers are running:
```powershell
docker compose ps
```

### 2. Check MQTT Connectivity
```powershell
# Subscribe to weight topic from host
docker exec -it itemreminder-mqtt mosquitto_sub -t "itemreminder/devices/+/weight"

# Or check backend logs
docker compose logs backend -f
```

### 3. Test Backend
```powershell
# Check health
curl http://localhost:5000/health

# Get items
curl http://localhost:5000/api/items -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Test Frontend
- Open http://localhost:3000
- Login with your account
- Go to Dashboard
- Create an item with device_id matching ESP32
- Weight should appear and update in real-time

### 5. Publish Test Data
If you want to test without hardware:

```powershell
# Connect to MQTT container
docker exec -it itemreminder-mqtt sh

# Publish test weight message
mosquitto_pub -t "itemreminder/devices/ESP32_001/weight" -m '{"device_id":"ESP32_001","item_name":"Pills","weight":800,"threshold":1000,"status":"OK","wifi_rssi":-65,"unit":"grams","uptime":3600,"free_heap":125000}'

# Check logs to verify backend received it
docker compose logs backend --tail 10
```

## Troubleshooting

### Weight Not Appearing in Frontend
1. **Check MQTT connectivity:**
   ```powershell
   docker compose logs mqttService | grep -i mqtt
   ```

2. **Verify ESP32 is publishing:**
   ```powershell
   docker exec -it itemreminder-mqtt mosquitto_sub -t "itemreminder/devices/ESP32_001/weight"
   ```

3. **Check browser console:**
   - Open DevTools (F12)
   - Look for Socket.io errors
   - Check for "weight_update" messages

4. **Check backend logs:**
   ```powershell
   docker compose logs backend -f
   ```

### MQTT Connection Fails
1. **Verify MQTT broker is running:**
   ```powershell
   docker compose ps | grep mosquitto
   ```

2. **Check MQTT config:**
   ```powershell
   cat mosquitto/config/mosquitto.conf
   ```

3. **Check ESP32 IP is correct:**
   - Verify `mqtt_server` IP matches your broker
   - In Docker: use `mqtt://mosquitto:1883` (container name)
   - From outside: use actual IP of machine running Docker

### Socket.io Not Connecting
1. **Check frontend logs in browser DevTools**
2. **Verify backend is serving WebSocket:**
   ```powershell
   docker compose logs backend | grep -i socket
   ```

3. **Check CORS settings in backend:**
   ```
   FRONTEND_URL in .env must match where frontend is hosted
   ```

## API Endpoints for Weight Data

### Get Item (includes current weight)
```
GET /api/items/{itemId}
Response: { currentWeight: 245.5, status: "OK", lastReading: "2025-12-09T15:00:00Z", ... }
```

### Get Weight History
```
GET /api/readings/item/{itemId}?limit=100&startDate=2025-12-01&endDate=2025-12-31
Response: [{ weight: 245.5, status: "OK", timestamp: "2025-12-09T15:00:00Z" }, ...]
```

### Get Analytics
```
GET /api/readings/analytics/{itemId}?period=7d
Response: { average: 850, min: 200, max: 1200, readings: [...], ... }
```

## Performance Optimization

### Polling Interval
Currently set to **10 seconds** in Dashboard. To change:

**File:** `frontend/src/pages/Dashboard.js`
```javascript
const pollInterval = setInterval(() => {
  fetchItems();
}, 10000); // Change this value (in milliseconds)
```

### MQTT Publishing Interval
Currently set to **2 seconds** on ESP32. To change:

**File:** `esp32/src/main.cpp`
```cpp
const unsigned long publish_interval = 2000; // milliseconds
```

### Database Cleanup
Old readings are automatically deleted after 90 days (TTL index on MongoDB).

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Weight shows 0g always | Check ESP32 firmware is configured with MQTT_ENABLED = true |
| Weight updates delayed | Increase polling interval or improve WiFi signal (check RSSI in data) |
| Threshold alerts not triggering | Verify notificationsEnabled = true in item settings, check alert logs |
| Socket.io connection fails | Check frontend URL in backend .env, ensure CORS is allowing frontend origin |
| MQTT broker not found | Use container name (mosquitto) in Docker, or actual IP when connecting from outside |

## Next Steps

1. **Calibrate Weight Sensor**
   - Send 'c' over serial to ESP32 to enter calibration mode
   - Follow on-device prompts
   - Updated calibration factor is stored in NVS (non-volatile storage)

2. **Set Custom Thresholds**
   - Edit item thresholdWeight in web app
   - Backend automatically sends update to ESP32 via MQTT command channel

3. **Create Geofence Alerts**
   - Combine with geofence feature for location-based notifications
   - Example: "Alert when pills are LOW and person exits home"

4. **Export Analytics**
   - Use /api/readings endpoints to export historical data
   - CSV export coming soon

## Support

Check logs for detailed error messages:
```powershell
# Backend
docker compose logs backend -f --tail 100

# Frontend (in browser DevTools console)
Press F12 → Console tab

# MQTT
docker compose logs mosquitto -f --tail 50
```

For issues, verify:
1. All containers running: `docker compose ps`
2. Network connectivity: `docker network ls`
3. Volumes: `docker volume ls`
