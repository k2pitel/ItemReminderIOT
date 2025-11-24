/*
 * ESP32 Item Reminder - Weight Sensor with Load Cell (HX711)
 * 
 * This firmware reads weight from a load cell using HX711 amplifier
 * and publishes data to MQTT broker for real-time monitoring.
 * 
 * Features:
 * - Real-time weight monitoring with HX711 load cell
 * - MQTT communication with backend
 * - Low weight detection and status reporting
 * - WiFi connection with auto-reconnect
 * - OTA updates support (optional)
 * 
 * Hardware:
 * - ESP32 Dev Board
 * - HX711 Load Cell Amplifier
 * - Load Cell (1kg - 5kg recommended)
 * 
 * Wiring:
 * HX711 DT  -> GPIO 16 (configurable)
 * HX711 SCK -> GPIO 17 (configurable)
 * HX711 VCC -> 3.3V
 * HX711 GND -> GND
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "HX711.h"

// ==================== CONFIGURATION ====================

// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";          // Replace with your WiFi SSID
const char* password = "YOUR_WIFI_PASSWORD";   // Replace with your WiFi password

// MQTT Configuration
const char* mqtt_server = "YOUR_MQTT_BROKER_IP";  // Replace with your MQTT broker IP (e.g., "192.168.1.100")
const int mqtt_port = 1883;
const char* mqtt_user = "";                    // Leave empty if no authentication
const char* mqtt_password = "";                // Leave empty if no authentication

// Device Configuration - MUST MATCH THE DEVICE ID IN YOUR WEB APP
const char* device_id = "ESP32_001";          // IMPORTANT: This must match the Item's Device ID in the web app
const char* item_name = "Pills";               // Item name (for logging only)

// HX711 Load Cell Pins
const int HX711_DT = 16;   // Data pin
const int HX711_SCK = 17;  // Clock pin

// Calibration
float calibration_factor = -7050; // Adjust this value during calibration
float zero_offset = 0;             // Tare offset

// Measurement Settings
float current_weight = 0.0;
float threshold_weight = 1000.0;   // Minimum weight in grams - can be updated via MQTT
unsigned long last_publish = 0;
const unsigned long publish_interval = 10000; // Publish every 10 seconds
const int num_readings = 5;        // Number of readings to average

// Topics
const char* weight_topic = "itemreminder/weight";
const char* status_topic = "itemreminder/status";
const char* command_topic = "itemreminder/command";

// ==================== GLOBALS ====================
WiFiClient espClient;
PubSubClient client(espClient);
HX711 scale;

// ==================== FUNCTIONS ====================

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.println("=================================");
  Serial.println("ESP32 Item Reminder - Booting...");
  Serial.println("=================================");
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("");
    Serial.println("✓ WiFi connected successfully!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal strength (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("");
    Serial.println("✗ WiFi connection failed!");
    Serial.println("Please check your SSID and password");
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("📨 MQTT Message received [");
  Serial.print(topic);
  Serial.print("]: ");
  
  String message;
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);

  // Parse command JSON
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, message);
  
  if (!error) {
    // Update threshold if received
    if (doc.containsKey("threshold")) {
      threshold_weight = doc["threshold"];
      Serial.print("✓ Threshold updated to: ");
      Serial.print(threshold_weight);
      Serial.println("g");
    }
    
    // Tare/zero the scale if requested
    if (doc.containsKey("tare") && doc["tare"] == true) {
      scale.tare();
      Serial.println("✓ Scale tared (zeroed)");
    }
    
    // Calibration factor update
    if (doc.containsKey("calibration")) {
      calibration_factor = doc["calibration"];
      scale.set_scale(calibration_factor);
      Serial.print("✓ Calibration factor updated to: ");
      Serial.println(calibration_factor);
    }
  } else {
    Serial.println("✗ Failed to parse command JSON");
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection to ");
    Serial.print(mqtt_server);
    Serial.print("...");
    
    // Create a unique client ID
    String clientId = "ESP32_";
    clientId += device_id;
    
    bool connected;
    if (strlen(mqtt_user) > 0) {
      connected = client.connect(clientId.c_str(), mqtt_user, mqtt_password);
    } else {
      connected = client.connect(clientId.c_str());
    }
    
    if (connected) {
      Serial.println(" ✓ Connected!");
      
      // Subscribe to command topic for remote configuration
      if (client.subscribe(command_topic)) {
        Serial.print("✓ Subscribed to: ");
        Serial.println(command_topic);
      }
      
      // Publish online status
      publishStatus("online");
    } else {
      Serial.print(" ✗ Failed, rc=");
      Serial.print(client.state());
      Serial.println(" | Retry in 5 seconds...");
      delay(5000);
    }
  }
}

float readWeight() {
  // Read multiple times and average for stability
  float total = 0;
  int valid_readings = 0;
  
  for (int i = 0; i < num_readings; i++) {
    if (scale.is_ready()) {
      float reading = scale.get_units(1);
      // Filter out obvious errors (negative weights or extreme values)
      if (reading >= -10 && reading <= 10000) {
        total += reading;
        valid_readings++;
      }
    }
    delay(50); // Small delay between readings
  }
  
  if (valid_readings > 0) {
    float average = total / valid_readings;
    // Round to 1 decimal place
    return round(average * 10.0) / 10.0;
  }
  
  return current_weight; // Return last known weight if no valid readings
}

String getStatusString(float weight) {
  if (weight <= 0) {
    return "EMPTY";
  } else if (weight < threshold_weight) {
    return "LOW";
  } else {
    return "OK";
  }
}

void publishWeight(float weight) {
  StaticJsonDocument<512> doc;
  
  // Required fields that backend expects
  doc["device_id"] = device_id;
  doc["item_name"] = item_name;
  doc["weight"] = weight;
  doc["threshold"] = threshold_weight;
  doc["status"] = getStatusString(weight);
  doc["wifi_rssi"] = WiFi.RSSI();
  
  // Optional metadata
  doc["unit"] = "grams";
  doc["uptime"] = millis() / 1000; // seconds
  doc["free_heap"] = ESP.getFreeHeap();
  
  char buffer[512];
  size_t len = serializeJson(doc, buffer);
  
  Serial.println("\n📤 Publishing weight data:");
  Serial.print("   Device ID: ");
  Serial.println(device_id);
  Serial.print("   Weight: ");
  Serial.print(weight);
  Serial.println("g");
  Serial.print("   Status: ");
  Serial.println(getStatusString(weight));
  Serial.print("   Threshold: ");
  Serial.print(threshold_weight);
  Serial.println("g");
  Serial.print("   WiFi RSSI: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");
  
  if (client.publish(weight_topic, buffer, len)) {
    Serial.println("✓ Published successfully");
  } else {
    Serial.println("✗ Publish failed");
  }
}

void publishStatus(const char* status) {
  StaticJsonDocument<256> doc;
  
  doc["device_id"] = device_id;
  doc["status"] = status;
  doc["ip"] = WiFi.localIP().toString();
  doc["uptime"] = millis() / 1000;
  doc["wifi_rssi"] = WiFi.RSSI();
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  if (client.publish(status_topic, buffer)) {
    Serial.print("✓ Status published: ");
    Serial.println(status);
  }
}

void calibrateScale() {
  Serial.println("\n=================================");
  Serial.println("CALIBRATION MODE");
  Serial.println("=================================");
  Serial.println("1. Remove all weight from scale");
  Serial.println("2. Send 'y' to tare (zero) the scale");
  
  while (!Serial.available()) {
    delay(100);
  }
  Serial.read();
  
  scale.tare();
  Serial.println("✓ Scale tared");
  
  Serial.println("\n3. Place a known weight on scale");
  Serial.println("4. Enter the weight in grams:");
  
  while (!Serial.available()) {
    delay(100);
  }
  float known_weight = Serial.parseFloat();
  
  Serial.println("\n5. Reading scale...");
  float reading = scale.get_units(10);
  
  float new_calibration = reading / known_weight;
  Serial.print("\nCalibration factor: ");
  Serial.println(new_calibration);
  Serial.println("\nUpdate 'calibration_factor' in code with this value");
  Serial.println("=================================\n");
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n");
  Serial.println("╔════════════════════════════════════╗");
  Serial.println("║   ESP32 Item Reminder System      ║");
  Serial.println("║   Version 2.0 - With HX711         ║");
  Serial.println("╚════════════════════════════════════╝");
  
  // Initialize HX711
  Serial.println("\n🔧 Initializing HX711 Load Cell...");
  scale.begin(HX711_DT, HX711_SCK);
  
  if (scale.is_ready()) {
    Serial.println("✓ HX711 initialized");
    
    // Set calibration factor
    scale.set_scale(calibration_factor);
    Serial.print("✓ Calibration factor set to: ");
    Serial.println(calibration_factor);
    
    // Tare the scale (zero it)
    Serial.println("⚖️  Taring scale (please ensure scale is empty)...");
    scale.tare();
    Serial.println("✓ Scale tared");
    
    // Uncomment the line below to run calibration mode
    // calibrateScale();
  } else {
    Serial.println("✗ HX711 initialization failed!");
    Serial.println("Please check wiring:");
    Serial.print("  DT pin:  ");
    Serial.println(HX711_DT);
    Serial.print("  SCK pin: ");
    Serial.println(HX711_SCK);
  }
  
  // Setup WiFi
  setup_wifi();
  
  // Setup MQTT
  Serial.println("\n🔧 Configuring MQTT...");
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  client.setKeepAlive(60);
  client.setSocketTimeout(30);
  
  Serial.print("✓ MQTT broker: ");
  Serial.print(mqtt_server);
  Serial.print(":");
  Serial.println(mqtt_port);
  
  Serial.println("\n✓ Setup complete!");
  Serial.println("=================================");
  Serial.print("Device ID: ");
  Serial.println(device_id);
  Serial.print("Item Name: ");
  Serial.println(item_name);
  Serial.println("=================================\n");
}

void loop() {
  // Maintain WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ WiFi connection lost. Reconnecting...");
    setup_wifi();
  }
  
  // Maintain MQTT connection
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Publish weight data at regular intervals
  unsigned long now = millis();
  if (now - last_publish > publish_interval) {
    last_publish = now;
    
    if (scale.is_ready()) {
      current_weight = readWeight();
      publishWeight(current_weight);
    } else {
      Serial.println("⚠️  HX711 not ready, skipping reading");
    }
  }
  
  // Small delay to prevent watchdog issues
  delay(10);
}
