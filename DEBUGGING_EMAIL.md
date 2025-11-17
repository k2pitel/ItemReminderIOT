# 🐛 Debugging: Why No Email?

## Problem Found: MQTT Topics Mismatch ✅ FIXED

The backend subscribes to: `itemreminder/weight` and `itemreminder/status`
We were publishing to: `iot/weight` ❌

**Now fixed to use:** `itemreminder/weight` ✅

---

## 🧪 Test Step-by-Step

### Terminal 1: Start MQTT Listener (to verify messages reach broker)

```powershell
cd 'c:\Users\sandr\OneDrive\Skrivebord\IOTsomething\ItemReminderIOT\backend'
node test-mqtt-subscribe.js
```

Keep this running. It will show any messages published to `itemreminder/#`

---

### Terminal 2: Watch Backend Logs

```powershell
docker logs -f itemreminder-backend
```

Keep this running. It will show backend processing in real-time.

---

### Terminal 3: Send Test MQTT Message

```powershell
cd 'c:\Users\sandr\OneDrive\Skrivebord\IOTsomething\ItemReminderIOT\backend'
node test-mqtt-complete.js
```

This will:
1. Create user (mqtttest / Test123!)
2. Create item (ESP32_001 / Coffee)
3. Send MQTT message to `itemreminder/weight`
4. Check for alerts

---

## ✅ What You Should See

### Terminal 1 (MQTT Listener):
```
📨 Message received on "itemreminder/weight":
   Raw: {"device_id":"ESP32_001","item_name":"Coffee","weight":15,...}
   Parsed: {
     "device_id": "ESP32_001",
     "item_name": "Coffee",
     "weight": 15,
     ...
   }
```

### Terminal 2 (Backend Logs):
```
info: Raw MQTT message on itemreminder/weight: "..."
info: 🚨 ALERT TRIGGERED: Your Coffee is running low (15g / 50g threshold)
info: 📧 Email notification will be sent to: kevin245312@gmail.com
info: ✅ Email sent successfully!
info:    Message ID: <xxx@gmail.com>
```

### Terminal 3 (Test Result):
```
✅ Found 1 alert(s) in database

📋 Most Recent Alert:
   Type: low_weight
   Severity: warning
   Message: Your Coffee is running low (15g / 50g threshold)
```

---

## 📧 Check Email

1. Go to: https://mail.google.com
2. Login as: kevin245312@gmail.com
3. Look for:
   - **Subject:** ⚠️ Low Stock Alert - Item Running Low
   - **From:** IoT Item Reminder <kevin245312@gmail.com>
   - **Body:** Your Coffee is running low...

**Check SPAM folder if not in inbox!**

---

## 🔧 If Still No Email

### Check 1: Verify Backend Received Message

If Terminal 2 (backend logs) shows NO message received:
- Backend MQTT client might not be connected properly
- Check: `docker logs itemreminder-backend | Select-String "MQTT"`
- Should see: "MQTT connected to broker"

### Check 2: Verify Email Settings

```powershell
cd backend
node send-test-email.js
```

If this works, email is configured correctly.

### Check 3: Verify Alert Was Created

```powershell
# Check MongoDB directly
docker exec -it itemreminder-mongodb mongosh --eval "use itemreminder; db.alerts.find().pretty()"
```

Should show alerts in database.

### Check 4: Check User Notification Settings

The user must have email notifications enabled:
- Login to frontend: http://localhost:3000
- Go to Settings
- Ensure "Email Notifications" is checked

---

## 🎯 Quick Test (All in One)

Run this single command to test everything:

```powershell
cd 'c:\Users\sandr\OneDrive\Skrivebord\IOTsomething\ItemReminderIOT\backend'

# Send message and watch logs
node test-mqtt-complete.js; Start-Sleep 3; docker logs itemreminder-backend --tail 30
```

Look for:
- ✅ Item created
- ✅ MQTT message published
- ✅ Backend received message (in logs)
- ✅ Alert created
- ✅ Email sent (in logs)

---

## 📝 Manual MQTT Test

If automated tests don't work, try manually:

```powershell
# Install MQTT CLI tool
npm install -g mqtt-cli

# Subscribe (Terminal 1)
mqtt sub -h localhost -t "itemreminder/#" -v

# Publish (Terminal 2)
mqtt pub -h localhost -t "itemreminder/weight" -m '{"device_id":"ESP32_001","item_name":"Coffee","weight":15,"threshold":50,"status":"LOW","wifi_rssi":-45}'
```

---

## ✅ Success Indicators

You know it's working when you see ALL of these:

1. ✅ MQTT listener receives message
2. ✅ Backend logs show "Raw MQTT message..."
3. ✅ Backend logs show "🚨 ALERT TRIGGERED..."
4. ✅ Backend logs show "📧 Email notification will be sent..."
5. ✅ Backend logs show "✅ Email sent successfully!"
6. ✅ Email appears in Gmail inbox

**If you see all 6, check your Gmail now!** 📧
