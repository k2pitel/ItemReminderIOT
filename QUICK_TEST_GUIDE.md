# 🚀 Quick Manual Test - Step by Step

Follow these steps to test the complete system flow.

## ✅ Step 1: Check Backend is Running

Your backend should be running and show:
```
✅ Server running on port 5000
✅ MongoDB connected successfully
✅ MQTT connected to broker
✅ Email transporter is ready
```

---

## 🧪 Step 2: Test MQTT Message (Simulate ESP32 sending weight data)

Open a **NEW PowerShell window** and run:

```powershell
cd 'c:\Users\sandr\OneDrive\Skrivebord\IOTsomething\ItemReminderIOT\backend'

node -e "
const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker');
  
  const message = {
    device_id: 'ESP32_001',
    item_name: 'Coffee',
    weight: 15,
    threshold: 50,
    status: 'LOW',
    wifi_rssi: -45
  };
  
  console.log('📤 Sending MQTT message...');
  console.log('   Device:', message.device_id);
  console.log('   Weight:', message.weight + 'g');
  console.log('   Status:', message.status);
  
  client.publish('iot/weight', JSON.stringify(message), (err) => {
    if (err) {
      console.error('❌ Failed:', err.message);
    } else {
      console.log('✅ MQTT message sent successfully!');
      console.log('📧 Check your email for low weight alert!');
    }
    client.end();
    process.exit(0);
  });
});

client.on('error', (err) => {
  console.error('❌ MQTT Error:', err.message);
  process.exit(1);
});
"
```

**Expected Result:**
- ✅ Message published to MQTT
- ✅ Backend receives and processes it
- ✅ Item weight updated in database
- ✅ Low weight alert created
- 📧 **EMAIL SENT to kevin245312@gmail.com**

Check backend terminal for:
```
🚨 ALERT TRIGGERED: Your Coffee is running low (15g / 50g threshold)
📧 Email notification will be sent to: ...
```

---

## 📍 Step 3: Test GPS with Geofence

First, you need to:
1. Login to frontend: http://localhost:3000
2. Create a geofence in the Geofences page
3. Create an item and link it to the geofence

**OR use the automated test:**

Open a NEW PowerShell and run:
```powershell
cd 'c:\Users\sandr\OneDrive\Skrivebord\IOTsomething\ItemReminderIOT\backend'
node end-to-end-test.js
```

This will:
- Create test user
- Create geofence
- Create item with geofence trigger
- Send MQTT message
- Simulate GPS inside geofence
- Simulate GPS outside geofence (triggers alert!)
- Check generated alerts

---

## 📧 Step 4: Check Your Email

Go to Gmail: https://mail.google.com/

Login as: **kevin245312@gmail.com**

You should see emails with subjects like:
- ⚠️ Low Stock Alert - Item Running Low
- 📍 Geofence Alert - Leaving Zone

**If you don't see them:**
1. Check SPAM folder
2. Check backend logs for email send confirmation
3. Run: `node send-test-email.js` to verify SMTP works

---

## 🌐 Step 5: Test via Frontend

1. **Open frontend**: http://localhost:3000

2. **Login** with credentials from the test or create new account

3. **Go to Items page**: 
   - Click "Add Item"
   - Create an item with your ESP32 device ID
   - Link it to a geofence (if you want geofence alerts)

4. **Go to Geofences page**:
   - Click "Add Geofence"
   - Click on map to set location
   - Set radius (e.g., 100m)
   - Save

5. **Go to Settings page**:
   - Enable "Email Notifications"
   - Enable "Location Tracking"
   - You should see your current GPS location

6. **Go to Map page**:
   - See your geofences as circles
   - See your current location as a blue marker
   - Move outside a geofence to trigger alert!

7. **Go to Alerts page**:
   - View all triggered alerts
   - See low weight alerts
   - See geofence alerts

---

## 🎯 Quick MQTT Test (Simplest)

Just run this one command:

```powershell
cd 'c:\Users\sandr\OneDrive\Skrivebord\IOTsomething\ItemReminderIOT\backend'

# Install mqtt tool if needed
npm install -g mqtt

# Publish test message
mqtt pub -h localhost -t iot/weight -m '{"device_id":"ESP32_001","item_name":"Coffee","weight":15,"threshold":50,"status":"LOW","wifi_rssi":-45}'
```

**Then check:**
1. Backend terminal for processing logs
2. Gmail inbox for email notification
3. Frontend alerts page for new alert

---

## ✅ Success Indicators

You know the system is working when:

### MQTT → Backend:
```
Backend logs show:
✅ Weight data received: ESP32_001
✅ Item updated: weight 15g
✅ 🚨 ALERT TRIGGERED: Low weight alert
✅ 📧 Email notification will be sent to: kevin245312@gmail.com
```

### Email Sent:
```
Backend logs show:
✅ Email sent successfully!
   Message ID: <some-id@gmail.com>
   To: kevin245312@gmail.com
```

### Frontend Updates:
- Dashboard shows updated weight
- Items page shows "LOW" status
- Alerts page shows new alert
- Real-time updates via WebSocket

---

## 🐛 Troubleshooting

### No Email Received?
```powershell
# Test email directly
cd backend
node send-test-email.js
```

### MQTT Not Working?
```powershell
# Check MQTT broker
docker ps | Select-String mosquitto

# Subscribe to see messages
mqtt sub -h localhost -t "iot/#" -v
```

### Backend Not Processing?
- Check backend terminal for errors
- Check `backend/logs/` folder
- Restart backend: Stop (Ctrl+C) and run `npm run dev`

---

## 🎉 Complete Test Command

Run everything at once (creates user, geofence, item, sends MQTT, simulates GPS):

```powershell
cd 'c:\Users\sandr\OneDrive\Skrivebord\IOTsomething\ItemReminderIOT\backend'
node end-to-end-test.js
```

Then check:
1. ✅ Terminal output for test results
2. 📧 Gmail inbox for emails
3. 🌐 Frontend alerts page for notifications

---

**Your system is now fully tested! 🚀**

All three components are working:
- ✅ MQTT messages from ESP32
- ✅ GPS location updates
- ✅ Email notifications via Gmail
