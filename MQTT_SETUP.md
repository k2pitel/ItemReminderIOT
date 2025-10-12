# MQTT Connection Setup Guide

This guide provides detailed instructions for connecting to the HiveMQ Cloud MQTT broker for the ItemReminderIOT project.

## Broker Information

### Connection Details

| Parameter | Value |
|-----------|-------|
| Broker URL | `85e1b192f896482fa682320d8d591396.s1.eu.hivemq.cloud` |
| MQTT Port (TLS) | `8883` |
| WebSocket Port (TLS) | `8884` |
| TLS Required | Yes |
| Authentication | Username/Password |

### Connection URLs

- **MQTT over TLS**: `85e1b192f896482fa682320d8d591396.s1.eu.hivemq.cloud:8883`
- **WebSocket over TLS**: `85e1b192f896482fa682320d8d591396.s1.eu.hivemq.cloud:8884/mqtt`

## Quick Start

### For Arduino/ESP32/ESP8266

1. Install required libraries:
   - PubSubClient
   - WiFiClientSecure

2. Copy `mqtt_config.h` to your Arduino libraries folder or keep it in the sketch folder

3. Update credentials in `ItemReminderIOT.ino`:
   ```cpp
   const char* mqtt_username = "your_hivemq_username";
   const char* mqtt_password = "your_hivemq_password";
   ```

4. Update WiFi credentials:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```

5. Upload to your device

### For Python

1. Install dependencies:
   ```bash
   pip install paho-mqtt
   ```

2. Update credentials in `mqtt_client_example.py`:
   ```python
   MQTT_USERNAME = "your_hivemq_username"
   MQTT_PASSWORD = "your_hivemq_password"
   ```

3. Run the script:
   ```bash
   python mqtt_client_example.py
   ```

### For Node.js

1. Install MQTT.js:
   ```bash
   npm install mqtt
   ```

2. Example code:
   ```javascript
   const mqtt = require('mqtt');
   
   const options = {
     host: '85e1b192f896482fa682320d8d591396.s1.eu.hivemq.cloud',
     port: 8883,
     protocol: 'mqtts',
     username: 'your_username',
     password: 'your_password'
   };
   
   const client = mqtt.connect(options);
   
   client.on('connect', () => {
     console.log('Connected to MQTT broker');
     client.subscribe('itemreminder/notification');
   });
   ```

## MQTT Topics Structure

### Topic Hierarchy

```
itemreminder/
├── notification    (Published by devices - item reminders)
├── status         (Published by devices - connection/health status)
└── command        (Subscribe by devices - receive commands)
```

### Message Formats

#### Notification Message
```json
{
  "item": "Item Name",
  "timestamp": 1234567890,
  "priority": "high|medium|low",
  "message": "Optional reminder message"
}
```

#### Status Message
```json
{
  "device_id": "ItemReminder_ESP32_001",
  "status": "online|offline",
  "timestamp": 1234567890
}
```

#### Command Message
```json
{
  "command": "reset|update|check",
  "parameters": {}
}
```

## Security Best Practices

### TLS/SSL Configuration

1. **Always use TLS** - Port 8883 for MQTT, 8884 for WebSockets
2. **Use proper CA certificates** in production (avoid `setInsecure()`)
3. **Keep credentials secure** - Never commit passwords to version control
4. **Use environment variables** for sensitive data

### Credential Management

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your credentials

3. Ensure `.env` is in `.gitignore`

## Testing the Connection

### Using MQTT Explorer (Recommended)

1. Download MQTT Explorer: http://mqtt-explorer.com/
2. Create new connection:
   - Name: ItemReminderIOT
   - Host: `85e1b192f896482fa682320d8d591396.s1.eu.hivemq.cloud`
   - Port: `8883`
   - Username: Your HiveMQ username
   - Password: Your HiveMQ password
   - Enable SSL/TLS
3. Connect and monitor topics

### Using Mosquitto CLI

Subscribe to all topics:
```bash
mosquitto_sub -h 85e1b192f896482fa682320d8d591396.s1.eu.hivemq.cloud \
  -p 8883 \
  -t "itemreminder/#" \
  -u "your_username" \
  -P "your_password" \
  --capath /etc/ssl/certs/
```

Publish a test message:
```bash
mosquitto_pub -h 85e1b192f896482fa682320d8d591396.s1.eu.hivemq.cloud \
  -p 8883 \
  -t "itemreminder/notification" \
  -m '{"item":"Test Item","timestamp":1234567890}' \
  -u "your_username" \
  -P "your_password" \
  --capath /etc/ssl/certs/
```

### Using HiveMQ WebSocket Client

1. Visit: http://www.hivemq.com/demos/websocket-client/
2. Configure connection:
   - Host: `85e1b192f896482fa682320d8d591396.s1.eu.hivemq.cloud`
   - Port: `8884`
   - Path: `/mqtt`
   - Enable SSL/TLS
   - Add credentials
3. Connect and test publish/subscribe

## Troubleshooting

### Connection Refused

- Verify credentials are correct
- Ensure TLS is enabled
- Check if port 8883 is not blocked by firewall

### Certificate Errors

- For testing, you can use `setInsecure()` on ESP devices
- For production, download and use the proper CA certificate

### Timeout Issues

- Check internet connection
- Verify broker URL is correct
- Increase keepalive timeout if needed

### Authentication Failed

- Double-check username and password
- Ensure there are no extra spaces or characters
- Verify credentials in HiveMQ Cloud dashboard

## Additional Resources

- HiveMQ Cloud Documentation: https://www.hivemq.com/docs/
- MQTT Protocol Specification: https://mqtt.org/
- PubSubClient Library: https://github.com/knolleary/pubsubclient
- Paho MQTT Python: https://www.eclipse.org/paho/index.php?page=clients/python/index.php

## Support

For issues related to:
- **MQTT Connection**: Check HiveMQ Cloud cluster status
- **Code Issues**: Open an issue in this repository
- **Hardware Issues**: Consult ESP32/ESP8266 documentation
