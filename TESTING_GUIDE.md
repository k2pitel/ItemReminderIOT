# 🧪 End-to-End System Testing Guide

This guide will help you test the complete workflow:
**MQTT Weight Messages → GPS Location Updates → Geofence Alerts → Email Notifications**

---

## 🚀 Quick Start - Automated Test

Run the automated end-to-end test script:

```powershell
cd backend
node end-to-end-test.js
```

This will automatically:
1. ✅ Create a test user
2. ✅ Create a geofence (Home)
3. ✅ Create an item with geofence trigger
4. ✅ Send MQTT weight message (LOW status)
5. ✅ Simulate GPS inside geofence
6. ✅ Simulate GPS outside geofence (triggers alert!)
7. ✅ Send email notification
8. ✅ Display generated alerts

---

## 📋 Prerequisites

### 1. Start the Backend Services

**Option A: Using Docker Compose (Recommended)**
```powershell
docker-compose up mongodb mosquitto
```

**Option B: Start Services Individually**
```powershell
# MongoDB (if installed locally)
# mongod --dbpath=<your-data-path>

# Mosquitto MQTT Broker
docker run -p 1883:1883 -p 9001:9001 eclipse-mosquitto:2
```

### 2. Start Backend Server

```powershell
cd backend
npm run dev
```

You should see:
```
MongoDB connected successfully
MQTT connected to broker: mqtt://localhost:1883
Server listening on port 5000
```

### 3. (Optional) Start Frontend

```powershell
cd frontend
npm start
```

---

## 🧪 Manual Testing Steps

If you want to test each component manually:

### Step 1: Create a User (via Frontend or API)

**Using curl/Postman:**
```powershell
curl -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{
    "username": "testuser",
    "email": "testuser@example.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

Save the returned `token` for next steps.

---

### Step 2: Create a Geofence

```powershell
$token = "YOUR_TOKEN_HERE"

curl -X POST http://localhost:5000/api/geofence `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $token" `
  -d '{
    "name": "Home",
    "location": {
      "latitude": 55.8826,
      "longitude": 9.8431
    },
    "radius": 100
  }'
```

Save the returned `_id` as your `geofenceId`.

---

### Step 3: Create an Item with Geofence Trigger

```powershell
$token = "YOUR_TOKEN_HERE"
$geofenceId = "YOUR_GEOFENCE_ID_HERE"

curl -X POST http://localhost:5000/api/items `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $token" `
  -d "{
    \"deviceId\": \"ESP32_TEST_001\",
    \"name\": \"Coffee Container\",
    \"description\": \"Test item with geofence\",
    \"geofenceId\": \"$geofenceId\",
    \"triggerCondition\": \"exit\",
    \"customAlertMessage\": \"Don't forget your coffee!\",
    \"thresholdWeight\": 50,
    \"unit\": \"grams\"
  }"
```

---

### Step 4: Send MQTT Weight Message (Simulate ESP32)

**Option A: Using MQTT Client (mosquitto_pub)**
```powershell
# Install mosquitto clients if not already installed
# Then publish a message:

mosquitto_pub -h localhost -t "iot/weight" -m '{"device_id":"ESP32_TEST_001","item_name":"Coffee Container","weight":25,"threshold":50,"status":"LOW","wifi_rssi":-45}'
```

**Option B: Using Node.js Script**

Create `test-mqtt-publish.js`:
```javascript
const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
  const message = {
    device_id: 'ESP32_TEST_001',
    item_name: 'Coffee Container',
    weight: 25,
    threshold: 50,
    status: 'LOW',
    wifi_rssi: -45
  };
  
  client.publish('iot/weight', JSON.stringify(message));
  console.log('✅ MQTT message sent');
  client.end();
});
```

Run it:
```powershell
node test-mqtt-publish.js
```

**Expected Result:**
- ✅ Backend receives MQTT message
- ✅ Item weight updated to 25g
- ✅ Status changed to LOW
- ✅ Low weight alert generated
- ✅ Email sent (check inbox!)

---

### Step 5: Send GPS Location (Inside Geofence)

```powershell
$token = "YOUR_TOKEN_HERE"

curl -X POST http://localhost:5000/api/geofence/location `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $token" `
  -d '{
    "latitude": 55.8826,
    "longitude": 9.8431,
    "accuracy": 10
  }'
```

**Expected Result:**
- ✅ User marked as INSIDE geofence
- ℹ️ No alert triggered (user is inside)

---

### Step 6: Send GPS Location (Outside Geofence) - **TRIGGER ALERT!**

```powershell
$token = "YOUR_TOKEN_HERE"

curl -X POST http://localhost:5000/api/geofence/location `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $token" `
  -d '{
    "latitude": 55.8850,
    "longitude": 9.8460,
    "accuracy": 10
  }'
```

**Expected Result:**
- ✅ User marked as OUTSIDE geofence
- 🚨 Geofence EXIT alert triggered!
- 📧 Email notification sent with:
  - Subject: "📍 Geofence Alert - Leaving Zone"
  - Body: "Don't forget your coffee!"
- ✅ Alert saved to database

**Check Your Email!** You should receive an email at `kevin245312@gmail.com`

---

### Step 7: Check Generated Alerts

```powershell
$token = "YOUR_TOKEN_HERE"

curl -X GET http://localhost:5000/api/alerts `
  -H "Authorization: Bearer $token"
```

You should see alerts with types:
- `low_weight` - From MQTT message (weight below threshold)
- `geofence` - From GPS exit trigger

---

## 📧 Expected Email Notifications

### Low Weight Alert Email:
```
Subject: ⚠️ Low Stock Alert - Item Running Low

Your item is running low:
- Item: Coffee Container
- Current Weight: 25g
- Threshold: 50g
- Status: LOW
```

### Geofence Alert Email:
```
Subject: 📍 Geofence Alert - Leaving Zone

Geofence Alert: You are leaving a geofence zone

Details:
- Item: Coffee Container
- Geofence: Home
- Trigger: Leaving zone
- Message: Don't forget your coffee!
```

---

## 🎯 Testing with Frontend

1. **Login**: http://localhost:3000/login
2. **Dashboard**: See item status (LOW)
3. **Items Page**: View all items and their current weights
4. **Alerts Page**: View all generated alerts
5. **Map Page**: 
   - Enable location tracking
   - See your geofence as a circle
   - See your current position
6. **Settings Page**: 
   - Enable/disable email notifications
   - Start GPS tracking

---

## 🐛 Troubleshooting

### Backend Not Receiving MQTT Messages?
```powershell
# Check if MQTT broker is running
docker ps | Select-String mosquitto

# Test MQTT connection
mosquitto_sub -h localhost -t "iot/#" -v
```

### No Email Received?
1. ✅ Check spam folder
2. ✅ Verify SMTP credentials in `.env`
3. ✅ Check backend logs: `backend/logs/`
4. ✅ Run email test: `node send-test-email.js`

### GPS Not Triggering Alerts?
1. ✅ Ensure item has `geofenceId` set
2. ✅ Ensure `triggerCondition` is set to `exit` or `both`
3. ✅ Check distance calculation (must be > radius)
4. ✅ Send inside location first, then outside

### Alerts Not Showing?
1. ✅ Check MongoDB is running
2. ✅ Verify user authentication token
3. ✅ Check backend console for errors
4. ✅ Query alerts directly: `GET /api/alerts`

---

## 🔄 Reset Test Data

To start fresh:

```powershell
# Stop all services
docker-compose down

# Remove MongoDB data (⚠️ WARNING: Deletes all data!)
docker-compose down -v

# Start fresh
docker-compose up mongodb mosquitto
cd backend
npm run dev
```

---

## ✅ Success Checklist

After running the tests, you should have:

- ✅ User created and authenticated
- ✅ Geofence created (Home)
- ✅ Item created with geofence trigger
- ✅ MQTT weight message received and processed
- ✅ Item weight updated in database
- ✅ Low weight alert generated
- ✅ GPS location updates processed
- ✅ Geofence exit detected
- ✅ Geofence alert generated
- ✅ **2 Emails received** (Low weight + Geofence)
- ✅ Alerts visible in database
- ✅ Real-time updates via WebSocket

---

## 🎉 Next Steps

Once testing is complete:
1. Deploy to production server
2. Connect real ESP32 devices
3. Use actual smartphone for GPS tracking
4. Configure production email settings
5. Set up monitoring and logging

**Happy Testing!** 🚀
