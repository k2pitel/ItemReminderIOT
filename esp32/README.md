# ESP32 Item Reminder - Firmware Configuration Guide

## System Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                    ESP32 Device Architecture                           │
└───────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                         ESP32 Firmware                                │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │                    Main Loop                                │     │
│  │  • Read weight sensor (every 5 seconds)                    │     │
│  │  • Publish to MQTT                                          │     │
│  │  • Handle incoming commands                                │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐      │
│  │    WiFi      │  │ MQTT Client  │  │  Sensor Simulator    │      │
│  │              │  │              │  │  (or HX711 driver)   │      │
│  │  • Connect   │  │  • Publish   │  │                      │      │
│  │  • Reconnect │  │  • Subscribe │  │  • Read ADC          │      │
│  │  • Monitor   │  │  • Callback  │  │  • Calculate weight  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘      │
│         │                 │                      │                  │
│         └─────────────────┼──────────────────────┘                  │
│                           │                                         │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │  MQTT Broker     │
                  │  (Mosquitto)     │
                  │                  │
                  │  Topics:         │
                  │  • /weight       │
                  │  • /status       │
                  │  • /command      │
                  └──────────────────┘
```

## Data Flow Diagram

```
┌────────────┐           ┌──────────────┐          ┌──────────────┐
│   Sensor   │  Analog   │     ADC      │  Digital │   ESP32      │
│  (Weight)  │──────────▶│   (GPIO 34)  │─────────▶│   Process    │
└────────────┘  Signal   └──────────────┘   Value  └──────┬───────┘
                                                           │
                                                           │ Format
                                                           │ JSON
                                                           ▼
                                                  ┌─────────────────┐
                                                  │  JSON Payload   │
                                                  │  {              │
                                                  │   device_id,    │
                                                  │   weight,       │
                                                  │   threshold,    │
                                                  │   status,       │
                                                  │   timestamp     │
                                                  │  }              │
                                                  └────────┬────────┘
                                                           │
                                                           │ MQTT Publish
                                                           ▼
                                                  ┌─────────────────┐
                                                  │  MQTT Broker    │
                                                  │  Topic:         │
                                                  │  itemreminder/  │
                                                  │  weight         │
                                                  └─────────────────┘
```

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

### Simulation Mode (Current Implementation)

```
┌─────────────────────────────────────┐
│          ESP32 DevKit               │
│                                     │
│  ┌──────────────────────────────┐   │
│  │  ADC GPIO 34                 │   │  Uses random value
│  │  (Sensor simulation)         │   │  generation for
│  └──────────────────────────────┘   │  demonstration
│                                     │
│  ┌──────────────────────────────┐   │
│  │  WiFi Module (built-in)      │   │
│  │  • 2.4GHz                    │   │
│  │  • WPA/WPA2                  │   │
│  └──────────────────────────────┘   │
│                                     │
│  ┌──────────────────────────────┐   │
│  │  USB Port                    │   │
│  │  • Power (5V)                │   │
│  │  • Serial Monitor            │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Production Mode (With Real HX711 Load Cell)

```
┌─────────────────────────────────────────────────────────────┐
│                  Hardware Setup                             │
└─────────────────────────────────────────────────────────────┘

ESP32 DevKit                          HX711 Module
┌──────────────┐                      ┌──────────────┐
│              │                      │              │
│   3.3V   ────┼──────────────────────┼──── VCC      │
│              │                      │              │
│   GND    ────┼──────────────────────┼──── GND      │
│              │                      │              │
│   GPIO 33 ───┼──────────────────────┼──── DT       │
│   (Data)     │                      │   (Data)     │
│              │                      │              │
│   GPIO 32 ───┼──────────────────────┼──── SCK      │
│   (Clock)    │                      │   (Clock)    │
│              │                      │              │
└──────────────┘                      └──────┬───────┘
                                             │
                                             │
                                      ┌──────▼───────┐
                                      │  Load Cell   │
                                      │              │
                                      │  E+ E- A+ A- │
                                      │  │  │  │  │  │
                                      └──┼──┼──┼──┼──┘
                                         Red Blk Wht Grn

Wiring Details:
═══════════════
ESP32          HX711          Load Cell
─────          ─────          ─────────
3.3V    ────▶  VCC
GND     ────▶  GND
GPIO 33 ────▶  DT (Data)
GPIO 32 ────▶  SCK (Clock)
               E+      ────▶  Red (Excitation+)
               E-      ────▶  Black (Excitation-)
               A+      ────▶  White (Signal+)
               A-      ────▶  Green (Signal-)
```

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
