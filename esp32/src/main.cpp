#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <HX711.h>
#include <Preferences.h>

const char* DEVICE_ID = "ESP32_001";
const char* ITEM_NAME = "Pills";
const char* WIFI_SSID = "AndroidAP470C";
const char* WIFI_PASS = "Andre1234";
const char* MQTT_BROKER = "192.168.229.112";
const int MQTT_PORT = 1883;

const int DT_PIN = 2;
const int SCK_PIN = 3;
const float DEFAULT_CALIBRATION = 1310.73;
const float MIN_WEIGHT = -10.0;
const float MAX_WEIGHT = 10000.0;
const unsigned long PUBLISH_INTERVAL = 2000;

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
HX711 scale;
Preferences preferences;

float currentWeight = 0.0;
float calibrationFactor = DEFAULT_CALIBRATION;
unsigned long lastPublish = 0;
char weightTopic[64];
char statusTopic[64];
char commandTopic[64];

void setupTopics() {
  sprintf(weightTopic, "itemreminder/devices/%s/weight", DEVICE_ID);
  sprintf(statusTopic, "itemreminder/devices/%s/status", DEVICE_ID);
  sprintf(commandTopic, "itemreminder/devices/%s/command", DEVICE_ID);
}

void connectWiFi() {
  Serial.printf("Connecting to WiFi: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nWiFi connected. IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\nWiFi connection failed!");
  }
}

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.printf("MQTT message [%s]: %s\n", topic, message.c_str());
  
  JsonDocument doc;
  if (deserializeJson(doc, message) == DeserializationError::Ok) {
    if (doc["threshold"].is<float>()) {
      float threshold = doc["threshold"];
      Serial.printf("Threshold updated: %.2f\n", threshold);
    }
    
    if (doc["tare"].is<bool>() && doc["tare"]) {
      Serial.println("Taring scale...");
      scale.tare();
    }
    
    if (doc["calibrate"].is<float>()) {
      calibrationFactor = doc["calibrate"];
      scale.set_scale(calibrationFactor);
      preferences.putFloat("calibration", calibrationFactor);
      Serial.printf("Calibration updated: %.2f\n", calibrationFactor);
    }
  }
}

void connectMqtt() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT...");
    
    if (mqttClient.connect(DEVICE_ID)) {
      Serial.println(" connected");
      mqttClient.subscribe(commandTopic);
      Serial.printf("Subscribed to: %s\n", commandTopic);
    } else {
      Serial.printf(" failed, rc=%d. Retrying in 5s\n", mqttClient.state());
      delay(5000);
    }
  }
}

float readWeight() {
  if (!scale.is_ready()) return currentWeight;
  
  float weight = scale.get_units(3);
  
  if (weight >= MIN_WEIGHT && weight <= MAX_WEIGHT) {
    return weight;
  }
  
  return currentWeight;
}

void publishWeight(float weight) {
  JsonDocument doc;
  doc["device_id"] = DEVICE_ID;
  doc["item_name"] = ITEM_NAME;
  doc["weight"] = weight;
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["timestamp"] = millis();
  
  String message;
  serializeJson(doc, message);
  
  if (mqttClient.publish(weightTopic, message.c_str())) {
    Serial.printf("Published weight: %.2fg\n", weight);
  } else {
    Serial.println("Failed to publish weight");
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("ESP32 Item Reminder starting...");
  Serial.printf("Device ID: %s\n", DEVICE_ID);
  
  setupTopics();
  
  preferences.begin("itemreminder", false);
  calibrationFactor = preferences.getFloat("calibration", DEFAULT_CALIBRATION);
  
  scale.begin(DT_PIN, SCK_PIN);
  if (scale.is_ready()) {
    scale.set_scale(calibrationFactor);
    scale.tare();
    Serial.printf("Scale ready. Calibration: %.2f\n", calibrationFactor);
  } else {
    Serial.println("Scale initialization failed!");
  }
  
  connectWiFi();
  
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(onMqttMessage);
  
  Serial.println("Setup complete!");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }
  
  if (!mqttClient.connected()) {
    connectMqtt();
  }
  
  mqttClient.loop();
  
  unsigned long now = millis();
  if (now - lastPublish > PUBLISH_INTERVAL) {
    lastPublish = now;
    
    float newWeight = readWeight();
    if (newWeight != currentWeight || abs(now - lastPublish) > 10000) {
      currentWeight = newWeight;
      publishWeight(currentWeight);
    }
  }
  
  delay(10);
}

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

  static int retryCount = 0;
  const int maxRetries = 5;

  while (!client.connected() && retryCount < maxRetries) {
    Serial.print("Attempting MQTT connection to ");
    Serial.print(mqtt_server);
    Serial.print(" (attempt ");
    Serial.print(retryCount + 1);
    Serial.print("/");
    Serial.print(maxRetries);
    Serial.print(")...");

    // Always set the server (in case it wasn't set before)
    client.setServer(mqtt_server, mqtt_port);
    
    // Check WiFi status first
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println(" WiFi disconnected! Reconnecting...");
      setup_wifi();
      delay(1000);
      continue;
    }
    
    Serial.print(" from IP ");
    Serial.print(WiFi.localIP());

    
    // Create a unique client ID
    String clientId = "ESP32_";
    clientId += device_id;
    clientId += "_";
    clientId += random(0xffff);

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
      retryCount = 0; // Reset retry count on success

      // Subscribe to command topics for remote configuration
      subscribeToCommandTopics();

      // Publish online status
      publishStatus("online");
      return; // Exit the function on success
    } else {
      retryCount++;
      int st = client.state();
      Serial.print(" failed, rc=");
      Serial.print(st);
      Serial.print(" (");
      // Print human-readable state when possible
      switch (st) {
        case -4: Serial.print("MQTT_CONNECTION_TIMEOUT"); break;
        case -3: Serial.print("MQTT_CONNECTION_LOST"); break;
        case -2: Serial.print("MQTT_CONNECT_FAILED"); break;
        case -1: Serial.print("MQTT_DISCONNECTED"); break;
        case 1: Serial.print("MQTT_CONNECT_BAD_PROTOCOL"); break;
        case 2: Serial.print("MQTT_CONNECT_BAD_CLIENT_ID"); break;
        case 3: Serial.print("MQTT_CONNECT_UNAVAILABLE"); break;
        case 4: Serial.print("MQTT_CONNECT_BAD_CREDENTIALS"); break;
        case 5: Serial.print("MQTT_CONNECT_UNAUTHORIZED"); break;
        default: Serial.print("UNKNOWN"); break;
      }
      Serial.print(") | Retry ");
      Serial.print(retryCount);
      Serial.print("/");
      Serial.println(maxRetries);
      
      if (retryCount < maxRetries) {
        Serial.println("[MQTT] Waiting 3 seconds before retry...");
        delay(3000);
      }
    }
  }
  
  if (retryCount >= maxRetries) {
    Serial.println("[MQTT] Max retries reached. Will try again in main loop.");
    retryCount = 0; // Reset for next time
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

  // Maintain MQTT connection - try reconnecting if disconnected
  if (MQTT_ENABLED && !client.connected()) {
    reconnect();
  }
  
  if (MQTT_ENABLED && client.connected()) {
    client.loop();
  }

  // Publish weight data at regular intervals
  unsigned long now = millis();
  if (now - last_publish > publish_interval) {
    last_publish = now;

    if (scale.is_ready()) {
      float previous_weight = current_weight;
      current_weight = readWeight();
      
      if (MQTT_ENABLED && client.connected()) {
        publishWeight(current_weight, previous_weight);
      } else if (MQTT_ENABLED) {
        Serial.println("[WARN] MQTT not connected, skipping weight publish");
      }
    } else {
      Serial.println("[WARN] HX711 not ready, skipping reading");
    }
  }

  // Small delay to prevent watchdog issues
  delay(10);
}