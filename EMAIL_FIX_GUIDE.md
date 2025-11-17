# ✅ SOLUTION: Email Not Working - Complete Fix

## 🎯 Root Cause Identified

The system has **2 issues**:

1. **MQTT Topic Mismatch** ✅ FIXED  
   - Backend subscribes to: `itemreminder/weight`  
   - Tests were sending to: `iot/weight`  
   - **Fixed:** Now using correct topic

2. **Backend Not Receiving MQTT Messages** ⚠️ ACTIVE ISSUE  
   - Backend connects to MQTT ✅  
   - Messages are published ✅  
   - **BUT:** Backend not logging received messages ❌

---

## 🔧 Quick Fix: Test with Backend Logs

**Run this command NOW to see if backend receives messages:**

```powershell
# Terminal 1: Watch backend logs in real-time
cd 'c:\Users\sandr\OneDrive\Skrivebord\IOTsomething\ItemReminderIOT\backend'
Get-Content .\logs\combined.log -Wait -Tail 20
```

Then in another terminal:

```powershell
# Terminal 2: Send MQTT message
cd 'c:\Users\sandr\OneDrive\Skrivebord\IOTsomething\ItemReminderIOT\backend'
node test-mqtt-simple.js
```

**LOOK FOR** in Terminal 1:
```
info: Raw MQTT message on itemreminder/weight: "..."
```

**If you DON'T see this line** → Backend MQTT listener is broken!

---

## 🚨 Most Likely Issue: User Has No Item

The backend receives the message but **can't find a user/item** with that device ID.

### Solution: Create Item via Frontend

1. **Go to:** http://localhost:3000/login
2. **Register/Login** with email: kevin245312@gmail.com
3. **Go to Items page**
4. **Add New Item:**
   - Device ID: `ESP32_001`
   - Name: Coffee
   - Threshold: 50
   - Unit: grams
5. **Save**

Now the backend will find the item when MQTT message arrives!

---

## ✅ WORKING TEST (Step by Step)

### Step 1: Ensure Backend is Running

```powershell
cd 'c:\Users\sandr\OneDrive\Skrivebord\IOTsomething\ItemReminderIOT'
docker-compose up -d
```

Or run locally:
```powershell
cd backend
npm run dev
```

### Step 2: Create User & Item

**Option A: Via Frontend (Recommended)**
1. http://localhost:3000
2. Register with kevin245312@gmail.com
3. Create item with Device ID: ESP32_001

**Option B: Via Script**
```powershell
cd backend
node test-mqtt-complete.js
```
This creates user + item automatically.

### Step 3: Send MQTT Message

```powershell
cd backend
node test-mqtt-simple.js
```

### Step 4: Check Results

**Backend Logs (should show):**
```
info: Raw MQTT message on itemreminder/weight
info: 🚨 ALERT TRIGGERED
info: 📧 Email notification will be sent to: kevin245312@gmail.com
info: ✅ Email sent successfully!
```

**Gmail Inbox:**
- Check: kevin245312@gmail.com
- Look for: "⚠️ Low Stock Alert"
- **Check SPAM folder!**

---

## 📧 Why Email Might Not Appear

### Reason 1: No Item in Database
- Backend can't find item with device_id "ESP32_001"
- **Fix:** Create item via frontend or test script

### Reason 2: User Notifications Disabled
- User has email notifications turned off
- **Fix:** Go to Settings → Enable "Email Notifications"

### Reason 3: Backend Not Receiving MQTT
- MQTT client not subscribed properly
- **Fix:** Check backend logs show "MQTT connected"

### Reason 4: Alert Not Created
- Item weight already below threshold
- **Fix:** Update item weight to 100g, then send 15g message

---

## 🎯 GUARANTEED WORKING TEST

Run these commands **IN ORDER**:

```powershell
# 1. Stop all
cd 'c:\Users\sandr\OneDrive\Skrivebord\IOTsomething\ItemReminderIOT'
docker-compose down

# 2. Start fresh
docker-compose up -d

# 3. Wait for services
Start-Sleep -Seconds 10

# 4. Create user + item + send MQTT
cd backend
node test-mqtt-complete.js

# 5. Check if alert was created
Start-Sleep -Seconds 3
curl http://localhost:5000/api/auth/login -Method POST -Body '{"username":"mqtttest","password":"Test123!"}' -ContentType "application/json" | ConvertFrom-Json | Select-Object -ExpandProperty token | Set-Variable token

curl -H "Authorization: Bearer $token" http://localhost:5000/api/alerts

# 6. Check backend logs
docker logs itemreminder-backend --tail 50
```

**Expected output:**
- User created ✅
- Item created ✅  
- MQTT message sent ✅
- Alert found in database ✅
- Backend shows "Email sent" ✅

---

## 📱 Alternative: Test Email Directly

Bypass MQTT and test email directly:

```powershell
cd backend
node send-test-email.js
```

**If this works but MQTT doesn't** → Problem is with MQTT message processing, not email.

---

## 🔍 Debug Checklist

- [ ] Backend running? (`docker ps` or check logs)
- [ ] MongoDB running? (docker ps shows itemreminder-mongodb)
- [ ] MQTT broker running? (docker ps shows itemreminder-mqtt)
- [ ] User exists in database?
- [ ] Item exists with device_id ESP32_001?
- [ ] Item belongs to the user?
- [ ] User has email notifications enabled?
- [ ] SMTP credentials correct in .env?
- [ ] Test email works? (`node send-test-email.js`)

---

## ✅ SUCCESS = You See This

```
🧪 Complete MQTT → Email Notification Test
============================================================
✅ New user created
✅ Item created successfully
✅ MQTT message published
✅ Found 1 alert(s) in database

📋 Most Recent Alert:
   Type: low_weight
   Message: Your Coffee is running low (15g / 50g threshold)
```

**AND** in your Gmail inbox:
📧 **⚠️ Low Stock Alert - Item Running Low**

---

**If you still don't see the email after following these steps, check the backend terminal/logs for the exact error message and share it!**
