# ESP32 Item Reminder Configuration

## Required Libraries

Install the following libraries in your Arduino IDE:

1. WiFi (built-in)
2. PubSubClient (by Nick O'Leary)
3. ArduinoJson (by Benoit Blanchon)

## Installation Steps

1. Open Arduino IDE
2. Install ESP32 board support:
   - Add to Additional Board Manager URLs: `https://dl.espressif.com/dl/package_esp32_index.json`
   - Go to Tools > Board > Boards Manager
   - Search for "ESP32" and install

3. Install required libraries:
   - Sketch > Include Library > Manage Libraries
   - Search and install each library listed above

4. Configure the firmware:
   - Update WiFi credentials (ssid, password)
   - Update MQTT broker details (mqtt_server, mqtt_user, mqtt_password)
   - Set device_id and item_name

5. Upload to ESP32:
   - Select your ESP32 board from Tools > Board
   - Select the correct port
   - Click Upload

## Hardware Connections

For actual weight sensor implementation:

- HX711 Load Cell Amplifier:
  - VCC -> 3.3V
  - GND -> GND
  - DT -> GPIO 33
  - SCK -> GPIO 32

For simulation mode (current implementation):
- Uses ADC pin 34 with random variations

## MQTT Topics

- `itemreminder/weight` - Weight data publication
- `itemreminder/status` - Device status updates
- `itemreminder/command` - Receive commands (subscribed)

## Troubleshooting

- If WiFi connection fails, check credentials
- If MQTT connection fails, verify broker is running
- Check serial monitor for debug messages
