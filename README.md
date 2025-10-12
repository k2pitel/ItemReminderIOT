# ItemReminderIOT

An IoT-based item reminder system using MQTT protocol for real-time notifications.

## MQTT Broker Configuration

This project uses **HiveMQ Cloud** as the MQTT broker for device communication.

### Connection Details

- **Broker URL**: `85e1b192f896482fa682320d8d591396.s1.eu.hivemq.cloud`
- **MQTT Port (TLS)**: `8883`
- **WebSocket Port (TLS)**: `8884`
- **TLS MQTT URL**: `85e1b192f896482fa682320d8d591396.s1.eu.hivemq.cloud:8883`
- **TLS WebSocket URL**: `85e1b192f896482fa682320d8d591396.s1.eu.hivemq.cloud:8884/mqtt`

### Security

- **TLS/SSL**: Required (enabled by default)
- **Authentication**: Username and password required
- **Port**: Use port 8883 for secure MQTT connections

## Getting Started

### Prerequisites

- ESP32 or ESP8266 microcontroller
- Arduino IDE or PlatformIO
- WiFi connection
- MQTT credentials from HiveMQ Cloud

### Required Libraries

Install the following libraries via Arduino Library Manager:

- `PubSubClient` by Nick O'Leary
- `WiFiClientSecure` (built-in for ESP32/ESP8266)

### Configuration

1. Open `mqtt_config.h` and add your MQTT credentials:
   ```cpp
   #define MQTT_USERNAME "your_username"
   #define MQTT_PASSWORD "your_password"
   ```

2. In `ItemReminderIOT.ino`, update your WiFi credentials:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```

3. Update MQTT credentials in the sketch:
   ```cpp
   const char* mqtt_username = "your_mqtt_username";
   const char* mqtt_password = "your_mqtt_password";
   ```

### MQTT Topics

The system uses the following topics:

- `itemreminder/notification` - Publish item reminder notifications
- `itemreminder/status` - Device status updates
- `itemreminder/command` - Receive commands from the server/app

### Upload and Run

1. Connect your ESP32/ESP8266 to your computer
2. Select the correct board and port in Arduino IDE
3. Upload the sketch
4. Open Serial Monitor (115200 baud) to view connection status

## Files

- `mqtt_config.h` - C++ header file with MQTT configuration constants
- `mqtt_config.json` - JSON configuration file for reference
- `ItemReminderIOT.ino` - Main Arduino sketch with MQTT implementation

## Configuration Files

### mqtt_config.h

C++ header file containing MQTT broker configuration for Arduino/ESP projects.

### mqtt_config.json

JSON configuration file for use with other platforms (Python, Node.js, etc.).

## Testing Connection

You can test the MQTT connection using:

- **MQTT Explorer**: Desktop application for MQTT debugging
- **HiveMQ WebSocket Client**: [http://www.hivemq.com/demos/websocket-client/](http://www.hivemq.com/demos/websocket-client/)
- **mosquitto_pub/sub**: Command-line MQTT clients

Example using mosquitto_pub:
```bash
mosquitto_pub -h 85e1b192f896482fa682320d8d591396.s1.eu.hivemq.cloud \
  -p 8883 \
  -t "itemreminder/notification" \
  -m "Test message" \
  -u "your_username" \
  -P "your_password" \
  --capath /etc/ssl/certs/
```

## License

This project is open source and available under the MIT License.