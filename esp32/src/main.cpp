#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "HX711.h"
#include <Preferences.h>

// ==================== CONFIGURATION ====================
// WiFi Configuration
const char* ssid = "Aura_Fiber_82031";
const char* password = "Rn2NGnZWEK2S";

// MQTT Configuration
const char* mqtt_server = "10.133.56.122";    // MQTT broker IP/host
const int mqtt_port = 1883;
const char* mqtt_user = "";                   // No authentication by default
const char* mqtt_password = "";               // No authentication by default
const bool MQTT_ENABLED = false;               // Toggle MQTT for debugging/experimentation

// Device Configuration - MUST MATCH THE DEVICE ID IN YOUR WEB APP
const char* device_id = "ESP32_001";
const char* item_name = "Pills";

// HX711 Load Cell Pins (ESP32-C3 compatible)
const int HX711_DT = 2;   // GPIO 2 (D0 on XIAO ESP32C3)
const int HX711_SCK = 3;  // GPIO 3 (D1 on XIAO ESP32C3)

// Calibration / Measurement Settings
float calibration_factor = 1310.73;  // Updated from latest calibration (fallback if NVS empty)
float current_weight = 0.0;
float threshold_weight = 1000.0;   // Minimum weight in grams - can be updated via MQTT
unsigned long last_publish = 0;
const unsigned long publish_interval = 2000;  // Publish every 2 seconds for faster updates
const float min_valid_weight = -10.0;      // Allow small negative drift (tare noise)
const float max_valid_weight = 10000.0;    // Max 10kg (realistic for pills)
const int num_readings = 3;        // Fewer samples to speed up loop
long last_raw_average = 0;         // Last raw ADC average from HX711
int last_valid_samples = 0;        // Count of valid averaged samples used

// MQTT Topics (per-device)
char weight_topic[128];
char status_topic[128];
char command_topic[128];
const char* broadcast_command_topic = "itemreminder/command"; // Backwards compatibility
char offline_status_payload[256];

// ==================== GLOBALS ====================
WiFiClient espClient;
PubSubClient client(espClient);
HX711 scale;
Preferences prefs;

// ==================== HELPERS ====================

void buildMqttTopics() {
  snprintf(weight_topic, sizeof(weight_topic), "itemreminder/devices/%s/weight", device_id);
  snprintf(status_topic, sizeof(status_topic), "itemreminder/devices/%s/status", device_id);
  snprintf(command_topic, sizeof(command_topic), "itemreminder/devices/%s/command", device_id);
}

void buildOfflinePayload() {
  JsonDocument doc;
  doc["device_id"] = device_id;
  doc["status"] = "offline";
  doc["reason"] = "unexpected_disconnect";
  serializeJson(doc, offline_status_payload, sizeof(offline_status_payload));
}

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
    Serial.println();
    Serial.println("[OK] WiFi connected");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal strength (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println();
    Serial.println("[ERR] WiFi connection failed!");
    Serial.println("Please check your SSID and password");
  }
}

void subscribeToCommandTopics() {
  // Device-scoped command topic
  if (client.subscribe(command_topic)) {
    Serial.print("[OK] Subscribed to: ");
    Serial.println(command_topic);
  } else {
    Serial.print("[ERR] Failed to subscribe to: ");
    Serial.println(command_topic);
  }

  // Optional broadcast commands for all devices (legacy support)
  if (client.subscribe(broadcast_command_topic)) {
    Serial.print("[OK] Subscribed to broadcast commands: ");
    Serial.println(broadcast_command_topic);
  } else {
    Serial.print("[ERR] Failed to subscribe to broadcast: ");
    Serial.println(broadcast_command_topic);
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("[MQTT] Message received [");
  Serial.print(topic);
  Serial.print("]: ");

  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);

  // Parse command JSON
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, message);

  if (!error) {
    // Update threshold if received
    if (doc["threshold"].is<float>()) {
      threshold_weight = doc["threshold"];
      Serial.print("[MQTT] Threshold updated to: ");
      Serial.print(threshold_weight);
      Serial.println("g");
    }

    // Tare/zero the scale if requested
    if (doc["tare"].is<bool>() && doc["tare"] == true) {
      scale.tare();
      Serial.println("[MQTT] Scale tared (zeroed)");
    }

    // Calibration factor update
    if (doc["calibration"].is<float>()) {
      calibration_factor = doc["calibration"];
      scale.set_scale(calibration_factor);
      Serial.print("[MQTT] Calibration factor updated to: ");
      Serial.println(calibration_factor);
    }
  } else {
    Serial.println("[ERR] Failed to parse command JSON");
  }
}

void publishStatus(const char* status);

void reconnect() {
  if (!MQTT_ENABLED) return;

  while (!client.connected()) {
    Serial.print("Attempting MQTT connection to ");
    Serial.print(mqtt_server);
    Serial.print("...");

    // Create a unique client ID
    String clientId = "ESP32_";
    clientId += device_id;

    bool connected;
    if (strlen(mqtt_user) > 0) {
      connected = client.connect(
        clientId.c_str(),
        mqtt_user,
        mqtt_password,
        status_topic,
        1,
        true,
        offline_status_payload
      );
    } else {
      connected = client.connect(
        clientId.c_str(),
        status_topic,
        1,
        true,
        offline_status_payload
      );
    }

    if (connected) {
      Serial.println(" connected!");

      // Subscribe to command topics for remote configuration
      subscribeToCommandTopics();

      // Publish online status
      publishStatus("online");
    } else {
      Serial.print(" failed, rc=");
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
  long raw_total = 0;
  int raw_samples = 0;

  for (int i = 0; i < num_readings; i++) {
    if (scale.is_ready()) {
      long raw = scale.read();      // Raw ADC value
      raw_total += raw;
      raw_samples++;

      float reading = scale.get_units(1); // Calibrated grams
      // Filter out obvious errors
      if (reading >= min_valid_weight && reading <= max_valid_weight) {
        total += reading;
        valid_readings++;
      }
    }
    delay(20); // Shorter delay for faster sampling
  }

  if (raw_samples > 0) {
    last_raw_average = raw_total / raw_samples;
  }

  last_valid_samples = valid_readings;

  if (valid_readings > 0) {
    float average = total / valid_readings;
    // Round to 1 decimal place
    return round(average * 10.0) / 10.0;
  }

  // No valid readings: return last known weight without verbose warning
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

void publishWeight(float weight, float previousWeight) {
  JsonDocument doc;

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

  Serial.println();
  Serial.println("[MQTT] Publishing weight data:");
  Serial.print("   Device ID: ");
  Serial.println(device_id);
  Serial.print("   Weight: ");
  Serial.print(weight);
  Serial.println("g");
  Serial.print("   Samples: ");
  Serial.print(last_valid_samples);
  Serial.print("/");
  Serial.println(num_readings);
  Serial.print("   Raw avg: ");
  Serial.println(last_raw_average);
  Serial.print("   Delta: ");
  Serial.print(weight - previousWeight);
  Serial.println("g");
  Serial.print("   Status: ");
  Serial.println(getStatusString(weight));
  Serial.print("   Threshold: ");
  Serial.print(threshold_weight);
  Serial.println("g");
  Serial.print("   WiFi RSSI: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");

  if (!MQTT_ENABLED) {
    Serial.println("[MQTT] Disabled for debugging; skipping publish");
    return;
  }

  if (client.publish(weight_topic, buffer, len)) {
    Serial.println("[OK] Published successfully");
  } else {
    Serial.println("[ERR] Publish failed");
  }
}

void publishStatus(const char* status) {
  JsonDocument doc;

  doc["device_id"] = device_id;
  doc["status"] = status;
  doc["ip"] = WiFi.localIP().toString();
  doc["uptime"] = millis() / 1000;
  doc["wifi_rssi"] = WiFi.RSSI();

  char buffer[256];
  serializeJson(doc, buffer);

  if (!MQTT_ENABLED) {
    Serial.print("[MQTT] Status '");
    Serial.print(status);
    Serial.println("' not sent (disabled)");
    return;
  }

  if (client.publish(status_topic, buffer, true)) {
    Serial.print("[MQTT] Status published: ");
    Serial.println(status);
  } else {
    Serial.println("[ERR] Failed to publish status");
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
  Serial.println("[CAL] Scale tared");

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
  // Apply and persist the new calibration factor
  scale.set_scale(new_calibration);
  prefs.putFloat("calib", new_calibration);
  Serial.print("[CAL] Saved calibration factor to NVS: ");
  Serial.println(new_calibration);
  Serial.println("\nUpdate 'calibration_factor' in code with this value");
  Serial.println("=================================\n");
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  // Initialize persistent storage for calibration
  prefs.begin("scale", false);

  // Validate stored calibration factor (ensure NVS contains a reasonable value)
  if (prefs.isKey("calib")) {
    float stored_check = prefs.getFloat("calib", calibration_factor);
    Serial.print("[DBG] Found stored calib in NVS: ");
    Serial.println(stored_check, 6);
    // Reject obviously invalid stored values
    if (isnan(stored_check) || stored_check == 0.0 || stored_check < 0.1 || stored_check > 100000.0) {
      Serial.println("[WARN] Stored calibration value looks invalid. Overwriting with compiled fallback and saving to NVS.");
      prefs.putFloat("calib", calibration_factor);
    } else {
      calibration_factor = stored_check;
    }
  } else {
    Serial.println("[INFO] No calibration value found in NVS. Writing compiled fallback to NVS.");
    prefs.putFloat("calib", calibration_factor);
  }

  Serial.println();
  Serial.println("=================================");
  Serial.println(" ESP32-C3 Item Reminder System ");
  Serial.println("=================================");

  buildMqttTopics();
  buildOfflinePayload();

  // Initialize HX711
  Serial.println("\nInitializing HX711 Load Cell...");
  Serial.print("   DT Pin:  GPIO ");
  Serial.println(HX711_DT);
  Serial.print("   SCK Pin: GPIO ");
  Serial.println(HX711_SCK);
  scale.begin(HX711_DT, HX711_SCK);

  // Small delay to let HX711 settle after power-up
  delay(200);

  if (scale.is_ready()) {
    Serial.println("[OK] HX711 initialized");

    // Debug: check if calibration is stored in NVS
    bool hasCalib = prefs.isKey("calib");
    Serial.print("[DBG] NVS has 'calib' key: ");
    Serial.println(hasCalib ? "yes" : "no");

    // Load calibration factor from NVS (fallback to compiled value)
    float stored = prefs.getFloat("calib", calibration_factor);
    Serial.print("[DBG] Stored calib read from NVS: ");
    Serial.println(stored, 6);

    // Ensure we use the value we expect
    calibration_factor = stored;
    Serial.print("[OK] Calibration factor set to: ");
    Serial.println(calibration_factor, 6);

    // Apply scale and tare after a short pause
    scale.set_scale(calibration_factor);
    delay(100);
    Serial.println("Taring scale (please ensure scale is empty)...");
    scale.tare();
    Serial.println("[OK] Scale tared");

    // Quick self-test: take a few unit readings to verify calibration applied
    float selftest = scale.get_units(5);
    if (selftest < min_valid_weight || selftest > max_valid_weight) {
      Serial.println("[WARN] Selftest reading outside expected range. You may need to re-calibrate or check wiring.");
    }

    // Give user the option to enter calibration mode via serial
    Serial.println("\nPress 'c' within 5 seconds to enter CALIBRATION MODE...");
    unsigned long start = millis();
    bool entered = false;
    while (millis() - start < 5000) {
      if (Serial.available()) {
        char ch = Serial.read();
        if (ch == 'c' || ch == 'C') {
          entered = true;
          break;
        }
      }
      delay(50);
    }

    if (entered) {
      calibrateScale();
    }
  } else {
    Serial.println("[ERR] HX711 initialization failed!");
    Serial.println("Please check wiring:");
    Serial.print("  DT pin:  ");
    Serial.println(HX711_DT);
    Serial.print("  SCK pin: ");
    Serial.println(HX711_SCK);
  }

  // Setup WiFi
  setup_wifi();

  // Setup MQTT (optional)
  if (MQTT_ENABLED) {
    Serial.println("\nConfiguring MQTT...");
    client.setServer(mqtt_server, mqtt_port);
    client.setCallback(callback);
    client.setKeepAlive(60);
    client.setSocketTimeout(30);
    client.setBufferSize(512);

    Serial.print("[MQTT] Broker: ");
    Serial.print(mqtt_server);
    Serial.print(":");
    Serial.println(mqtt_port);
  } else {
    Serial.println("\n[MQTT] Disabled for debugging; skipping MQTT setup");
  }

  Serial.println("\nSetup complete!");
  Serial.println("=================================");
  Serial.print("Device ID: ");
  Serial.println(device_id);
  Serial.print("Item Name: ");
  Serial.println(item_name);
  Serial.print("Weight topic: ");
  Serial.println(weight_topic);
  Serial.print("Status topic: ");
  Serial.println(status_topic);
  Serial.print("Command topic: ");
  Serial.println(command_topic);
  Serial.println("=================================\n");
}

void loop() {
  // Check for serial commands (calibration on-demand)
  if (Serial.available()) {
    char cmd = Serial.read();
    if (cmd == 'c' || cmd == 'C') {
      Serial.println("\n>>> Entering CALIBRATION MODE <<<");
      calibrateScale();
    }
  }

  // Maintain WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WARN] WiFi connection lost. Reconnecting...");
    setup_wifi();
  }

  // Maintain MQTT connection
  if (MQTT_ENABLED) {
    if (!client.connected()) {
      reconnect();
    }
    client.loop();
  }

  // Publish weight data at regular intervals
  unsigned long now = millis();
  if (now - last_publish > publish_interval) {
    last_publish = now;

    if (scale.is_ready()) {
      float previous_weight = current_weight;
      current_weight = readWeight();
      publishWeight(current_weight, previous_weight);
    } else {
      Serial.println("[WARN] HX711 not ready, skipping reading");
    }
  }

  // Small delay to prevent watchdog issues
  delay(10);
}
