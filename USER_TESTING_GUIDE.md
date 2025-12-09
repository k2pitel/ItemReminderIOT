# Weight Sensor Testing Guide - User Walkthrough

## ✅ System Status
All components verified working:
- ✅ Backend API running on port 5000
- ✅ Frontend UI running on port 3000  
- ✅ MQTT broker receiving sensor data
- ✅ Socket.io real-time connection working
- ✅ Database storing weight readings

---

## 📋 Step-by-Step Testing Instructions

### **PART 1: Login to Your Account**

**Step 1.1:** Open your web browser and go to: **http://localhost:3000**

**Step 1.2:** You will see the login page. Enter your credentials:
- **Email:** Your registered email
- **Password:** Your password
- Click **LOGIN**

**Expected Result:** 
- You are redirected to the **Dashboard** page
- You should see a list of your items (if any exist)

---

### **PART 2: Create a Test Item**

**Step 2.1:** Click the **Items** menu option (left sidebar)

**Step 2.2:** Click the **"+ ADD ITEM"** button (top right)

**Step 2.3:** Fill in the form with these values:
- **Device ID:** `ESP32_001` (this matches the test sensor)
- **Name:** `Pills` (or your item name)
- **Description:** `Weight sensor test item`
- **Threshold Weight:** `1000` (grams)
- **Unit:** `grams`
- **Detection Mode:** `weight`
- **Enable Notifications:** ✓ (checked)

**Step 2.4:** Click **SAVE**

**Expected Result:**
- Item is created and appears in the items list
- You see a confirmation message

---

### **PART 3: View Item on Dashboard**

**Step 3.1:** Click **Dashboard** in the left sidebar

**Step 3.2:** You should see a card for your new item with:
- **Item Name:** Pills
- **Status Badge:** Currently showing (may be OFFLINE initially)
- **Weight Display:** Shows current weight in grams
- **Progress Bar:** Visualizes weight vs. threshold
- **Device ID:** ESP32_001
- **Last Updated:** Timestamp

**Expected Result:**
- Item card is visible on dashboard
- Status shows current state (may be 0g initially)

---

### **PART 4: Simulate Sensor Data (Test Without Hardware)**

If you don't have the ESP32 hardware running, we can simulate sensor readings:

**Step 4.1:** Open a terminal/PowerShell

**Step 4.2:** Run this command to simulate weight sensor sending data:
```powershell
docker exec itemreminder-mqtt mosquitto_pub -t "itemreminder/devices/ESP32_001/weight" -m '{\"device_id\":\"ESP32_001\",\"item_name\":\"Pills\",\"weight\":750,\"threshold\":1000,\"status\":\"OK\",\"wifi_rssi\":-65,\"unit\":\"grams\"}'
```

**Step 4.3:** Go back to your browser (Dashboard page) and watch the weight update!

**Expected Result:**
- Weight changes from 0g to **750g**
- Status badge shows **OK** (green)
- Progress bar shows 75% filled
- Last updated timestamp changes

---

### **PART 5: Test Status Changes**

**Test "LOW" Status:**

**Step 5.1:** Send a LOW weight reading:
```powershell
docker exec itemreminder-mqtt mosquitto_pub -t "itemreminder/devices/ESP32_001/weight" -m '{\"device_id\":\"ESP32_001\",\"item_name\":\"Pills\",\"weight\":500,\"threshold\":1000,\"status\":\"LOW\",\"wifi_rssi\":-65,\"unit\":\"grams\"}'
```

**Expected Result:**
- Weight shows **500g**
- Status badge turns **YELLOW** (warning)
- Progress bar shows 50% filled

**Test "EMPTY" Status:**

**Step 5.2:** Send an EMPTY reading:
```powershell
docker exec itemreminder-mqtt mosquitto_pub -t "itemreminder/devices/ESP32_001/weight" -m '{\"device_id\":\"ESP32_001\",\"item_name\":\"Pills\",\"weight\":0,\"threshold\":1000,\"status\":\"EMPTY\",\"wifi_rssi\":-65,\"unit\":\"grams\"}'
```

**Expected Result:**
- Weight shows **0g**
- Status badge turns **RED** (critical)
- Progress bar is empty

---

### **PART 6: View Weight History & Analytics**

**Step 6.1:** Click **Analytics** in the left sidebar

**Step 6.2:** Select your item from the dropdown ("Pills")

**Step 6.3:** Choose a time period:
- **7d** (last 7 days)
- **30d** (last 30 days)
- **90d** (last 90 days)

**Expected Result:**
- Line chart shows weight history
- Statistics display: Min, Max, Average weight
- All your test readings appear in the chart

**Step 6.4:** Click on the **Readings** tab to see a table of all weight readings:
- Timestamp of each reading
- Weight value
- Status at that time

**Expected Result:**
- All your test messages appear as readings
- Sorted by most recent first

---

### **PART 7: Edit Item Settings**

**Step 7.1:** Go back to **Dashboard**

**Step 7.2:** Click the **Edit** (pencil) icon on your item card

**Step 7.3:** Change the **Threshold Weight** to `600` grams

**Step 7.4:** Click **SAVE**

**Expected Result:**
- Item threshold updated
- Dashboard immediately reflects change
- Your 750g reading now shows as **LOW** (red) since 750 > 600

---

### **PART 8: Test Real-Time Updates**

**Step 8.1:** On the **Dashboard** page, keep your browser window open

**Step 8.2:** Open a terminal/PowerShell in another window

**Step 8.3:** Send multiple weight readings in quick succession:
```powershell
# Reading 1: 800g
docker exec itemreminder-mqtt mosquitto_pub -t "itemreminder/devices/ESP32_001/weight" -m '{\"device_id\":\"ESP32_001\",\"item_name\":\"Pills\",\"weight\":800,\"threshold\":600,\"status\":\"OK\",\"wifi_rssi\":-65,\"unit\":\"grams\"}'

# Wait 2 seconds, then...

# Reading 2: 400g
docker exec itemreminder-mqtt mosquitto_pub -t "itemreminder/devices/ESP32_001/weight" -m '{\"device_id\":\"ESP32_001\",\"item_name\":\"Pills\",\"weight\":400,\"threshold\":600,\"status\":\"LOW\",\"wifi_rssi\":-65,\"unit\":\"grams\"}'

# Wait 2 seconds, then...

# Reading 3: 100g
docker exec itemreminder-mqtt mosquitto_pub -t "itemreminder/devices/ESP32_001/weight" -m '{\"device_id\":\"ESP32_001\",\"item_name\":\"Pills\",\"weight\":100,\"threshold\":600,\"status\":\"LOW\",\"wifi_rssi\":-65,\"unit\":\"grams\"}'
```

**Expected Result:**
- Dashboard updates in REAL-TIME as you send each reading
- No page refresh needed
- Weight, status, progress bar all update instantly
- Timestamp updates for each change

---

### **PART 9: Test with Real Hardware (Optional)**

If you have your ESP32 connected:

**Step 9.1:** Ensure ESP32 is programmed with correct settings:
```cpp
const char* device_id = "ESP32_001";
const char* mqtt_server = "10.133.56.122";  // Your MQTT broker IP
const bool MQTT_ENABLED = true;              // MUST BE TRUE!
```

**Step 9.2:** Power on the ESP32

**Step 9.3:** Watch the Dashboard - weight should update automatically every 2 seconds!

**Step 9.4:** Place different weights on the sensor and watch the updates:
- Empty: 0g (EMPTY status - red)
- Light weight: 200g (LOW status - yellow)
- Full: 800g (OK status - green)

---

## 🔍 Troubleshooting During Testing

### **Weight Doesn't Update**

1. **Check if Docker services are running:**
   ```powershell
   docker compose ps
   ```
   All four containers should show "Up"

2. **Check browser console for errors:**
   - Press F12 in browser
   - Go to **Console** tab
   - Look for any red error messages
   - Check for "Socket.io connected" message

3. **Verify backend is receiving MQTT:**
   ```powershell
   docker compose logs backend --tail 20
   ```
   Should show "MQTT message received on itemreminder/devices/ESP32_001/weight"

4. **Try refreshing the page:**
   - Press F5 or Ctrl+R
   - Wait for page to load completely
   - Send a new test message

### **Item Not Appearing on Dashboard**

1. Check you're logged in (if not, you'll be redirected to login)
2. Make sure you created the item with correct Device ID
3. Refresh the page (F5)
4. Check the Items page to verify item exists

### **Analytics Page Shows No Data**

1. Make sure you've sent at least one weight reading
2. Select the correct item from the dropdown
3. Wait a few seconds for the chart to load
4. Try a different time period (7d, 30d, etc.)

---

## 📊 Expected Results Summary

| Test | Expected Outcome | Status |
|------|------------------|--------|
| Login | Redirected to Dashboard | ✅ |
| Create Item | Item appears on Dashboard | ✅ |
| Send 750g | Weight shows 750g, Status OK (green) | ✅ |
| Send 500g | Weight shows 500g, Status LOW (yellow) | ✅ |
| Send 0g | Weight shows 0g, Status EMPTY (red) | ✅ |
| Analytics | Chart shows weight history | ✅ |
| Real-time Update | Dashboard updates instantly | ✅ |
| Hardware Test | Updates every 2 seconds | ✅ (with hardware) |

---

## 🎯 What the System Does

**Without Hardware (Simulated):**
- You can test all UI features
- Send test weight data from terminal
- Verify dashboard updates work
- Check analytics display correctly

**With Real ESP32:**
- Sensor sends weight automatically every 2 seconds
- Dashboard updates in real-time
- Readings stored for historical analysis
- Alerts trigger when weight drops below threshold

---

## 💡 Tips for Testing

1. **Keep browser DevTools open (F12)** to see Socket.io messages
2. **Use multiple browser tabs** - one for Dashboard, one for Analytics
3. **Send readings quickly** to test real-time performance
4. **Check timestamp changes** to verify updates are working
5. **Try different thresholds** to see status color changes

---

## 🚀 Next Steps After Testing

If everything works:

1. **Connect Real Hardware:**
   - Program ESP32 with correct WiFi and MQTT settings
   - Ensure it can reach your MQTT broker IP
   - Power it on and watch real-time data flow

2. **Set Up Geofence Alerts:**
   - Create geofences on your home/work locations
   - Combine with weight sensor for smart notifications

3. **Monitor Analytics:**
   - View historical trends
   - Identify usage patterns
   - Export data if needed

4. **Customize Thresholds:**
   - Set minimum weight levels per item
   - Receive alerts before items run out
   - Get notifications automatically

---

## 📞 Support

If you encounter issues:

1. Check Docker logs:
   ```powershell
   docker compose logs backend -f
   docker compose logs frontend -f
   ```

2. Check browser console (F12)

3. Verify all containers running:
   ```powershell
   docker compose ps
   ```

4. Test MQTT connection:
   ```powershell
   docker compose logs mosquitto --tail 20
   ```
