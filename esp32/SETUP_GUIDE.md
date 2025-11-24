# ESP32 Item Reminder - Complete Setup Guide

## 📋 Hardware Requirements

### Components Needed
- **ESP32 Development Board** (ESP32-DevKitC or similar)
- **HX711 Load Cell Amplifier Module**
- **Load Cell** (1kg - 5kg capacity recommended)
- **Micro USB Cable** (for programming and power)
- **Jumper Wires**

---

## 🔌 Wiring Diagram

```
ESP32              HX711              Load Cell
=====              =====              =========
GPIO 16  -------> DT
GPIO 17  -------> SCK
3.3V     -------> VCC
GND      -------> GND
                  E+    -----------> Red (Excitation+)
                  E-    -----------> Black (Excitation-)
                  A+    -----------> White (Signal+)
                  A-    -----------> Green (Signal-)
```

### Pin Configuration
| ESP32 Pin | HX711 Pin | Purpose |
|-----------|-----------|---------|
| GPIO 16   | DT        | Data    |
| GPIO 17   | SCK       | Clock   |
| 3.3V      | VCC       | Power   |
| GND       | GND       | Ground  |

---

## 💻 Software Setup

### 1. Install Arduino IDE
- Download from: https://www.arduino.cc/en/software
- Install version 2.0 or higher

### 2. Install ESP32 Board Support
1. Open Arduino IDE
2. Go to `File` → `Preferences`
3. Add to "Additional Board Manager URLs":
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to `Tools` → `Board` → `Boards Manager`
5. Search for "ESP32" and install "esp32 by Espressif Systems"

### 3. Install Required Libraries
Go to `Sketch` → `Include Library` → `Manage Libraries` and install:
- **HX711** by Bogdan Necula
- **PubSubClient** by Nick O'Leary
- **ArduinoJson** by Benoit Blanchon (version 6.x)

---

## ⚙️ Configuration

### Step 1: Find Your Computer's IP Address

**Windows:**
```powershell
ipconfig
```
Look for "IPv4 Address" (e.g., 192.168.1.100)

**macOS/Linux:**
```bash
ifconfig
```

### Step 2: Edit `item_reminder.ino`

Update these values in the code:

```cpp
// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";          // Your WiFi network name
const char* password = "YOUR_WIFI_PASSWORD";   // Your WiFi password

// MQTT Configuration  
const char* mqtt_server = "192.168.1.100";    // Your computer's IP address
const int mqtt_port = 1883;

// Device Configuration - MUST MATCH WEB APP!
const char* device_id = "ESP32_001";          // CRITICAL: Must match Item's Device ID
const char* item_name = "Pills";               // Your item name

// Settings
float calibration_factor = -7050;             // Adjust after calibration
float threshold_weight = 1000.0;              // Low weight alert threshold (grams)
```

### Step 3: Upload to ESP32
1. Connect ESP32 to computer via USB
2. Select Board: `Tools` → `Board` → `ESP32 Dev Module`
3. Select Port: `Tools` → `Port` → `COM3` (or your port)
4. Click **Upload** button (→)

### Step 4: Monitor Serial Output
1. Open Serial Monitor: `Tools` → `Serial Monitor`
2. Set baud rate to **115200**
3. You should see connection messages

---

## 📏 Calibration Process

### Why Calibrate?
To get accurate weight readings from your specific load cell.

### Steps:
1. **Enable calibration mode** - Uncomment in code:
   ```cpp
   calibrateScale();  // Remove the // at start
   ```

2. **Upload and open Serial Monitor**

3. **Follow the prompts:**
   - Remove all weight from scale
   - Send 'y' when prompted
   - Place a known weight (e.g., 100g, 500g)
   - Enter the weight value
   - Note the calibration factor shown

4. **Update code with new factor:**
   ```cpp
   float calibration_factor = -7050.25;  // Use your value
   ```

5. **Comment out calibration mode:**
   ```cpp
   // calibrateScale();  // Add // at start
   ```

6. **Re-upload**

---

## 🚀 Usage

### Creating Item in Web App
1. Go to http://localhost:3000
2. Login to your account
3. Navigate to **Items** page
4. Click **Add Item**
5. Fill in details:
   - **Device ID**: `ESP32_001` (must match code!)
   - **Name**: Pills
   - **Threshold**: 1000 grams
   - **Geofence**: Select your geofence

### Testing
1. Place item on scale
2. Watch weight update in web app
3. Remove weight below threshold
4. Check email for low stock alert

---

## 🔧 Troubleshooting

### HX711 Not Ready
❌ **Error:** `HX711 initialization failed`

✅ **Fix:**
- Check all wiring connections
- Verify GPIO pin numbers (16 for DT, 17 for SCK)
- Ensure HX711 has power (VCC → 3.3V, GND → GND)

### WiFi Won't Connect
❌ **Error:** `WiFi connection failed`

✅ **Fix:**
- Verify SSID and password
- Use 2.4GHz WiFi (ESP32 doesn't support 5GHz)
- Check signal strength

### MQTT Won't Connect
❌ **Error:** `MQTT connection failed, rc=-2`

✅ **Fix:**
- Verify MQTT broker IP address
- Check Docker is running: `docker ps`
- Test port: `telnet YOUR_IP 1883`
- Check firewall settings

### Backend Not Receiving Data
❌ **Problem:** No updates in web app

✅ **Fix:**
1. Check Device ID matches exactly
2. Verify item exists in web app
3. Check backend logs:
   ```bash
   docker logs itemreminder-backend --tail 20
   ```
4. Test MQTT:
   ```bash
   docker exec itemreminder-mqtt mosquitto_sub -h localhost -t "itemreminder/#"
   ```

### Inaccurate Weight Readings
❌ **Problem:** Wrong weight values

✅ **Fix:**
- Re-calibrate with known weight
- Check load cell mounting
- Ensure stable surface
- Increase averaging: `num_readings = 10`

---

## 📊 Serial Monitor Output

### Successful Boot
```
╔════════════════════════════════════╗
║   ESP32 Item Reminder System      ║
║   Version 2.0 - With HX711         ║
╚════════════════════════════════════╝

✓ HX711 initialized
✓ WiFi connected successfully!
IP address: 192.168.1.150
✓ MQTT Connected!

📤 Publishing weight data:
   Device ID: ESP32_001
   Weight: 125.5g
   Status: LOW
   Threshold: 1000.0g
✓ Published successfully
```

---

## 🎯 Features

- ✅ Real-time weight monitoring
- ✅ MQTT communication
- ✅ Auto-reconnect (WiFi & MQTT)
- ✅ Remote configuration
- ✅ Multi-sample averaging
- ✅ Low weight detection
- ✅ Email notifications
- ✅ WiFi signal monitoring

---

## 🔄 Remote Commands

Send JSON to topic `itemreminder/command`:

**Update threshold:**
```json
{"threshold": 500}
```

**Tare (zero) scale:**
```json
{"tare": true}
```

**Update calibration:**
```json
{"calibration": -7050.25}
```

---

## 💡 Tips

1. **Device ID is critical** - Must match exactly between ESP32 and web app
2. **Use stable power** - USB power from computer or 5V wall adapter
3. **Stable surface** - Place scale on firm, level surface
4. **Calibrate properly** - Use accurate known weights
5. **Check logs** - Serial Monitor and backend logs show everything

---

## 🆘 Still Need Help?

1. Check Serial Monitor for error messages
2. Verify all settings are correct
3. Test WiFi connection separately
4. Test MQTT connection separately
5. Review backend logs
6. Ensure Docker containers are running

---

## 📚 Resources

- ESP32 Docs: https://docs.espressif.com/projects/esp-idf/
- HX711 Library: https://github.com/bogde/HX711
- MQTT Client: https://github.com/knolleary/pubsubclient
- Load Cell Tutorial: https://randomnerdtutorials.com/esp32-load-cell-hx711/

---

**Happy Building! 🚀**
