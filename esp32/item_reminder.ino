/*
 * ESP32 Item Reminder - Weight Sensor Simulator
 * 
 * This firmware simulates a weight sensor for item tracking and publishes
 * data to an MQTT broker for real-time monitoring.
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT Configuration
const char* mqtt_server = "YOUR_MQTT_BROKER";
const int mqtt_port = 1883;
const char* mqtt_user = "YOUR_MQTT_USER";
const char* mqtt_password = "YOUR_MQTT_PASSWORD";
const char* mqtt_client_id = "ESP32_ItemReminder";

// Topics
const char* weight_topic = "itemreminder/weight";
const char* status_topic = "itemreminder/status";
const char* command_topic = "itemreminder/command";

// Device Configuration
const char* device_id = "DEVICE_001";
const char* item_name = "Medicine Box";

// Sensor Simulation
const int WEIGHT_PIN = 34; // ADC pin for weight sensor (simulated)
float current_weight = 0.0;
float threshold_weight = 10.0; // Minimum weight in grams
unsigned long last_publish = 0;
const unsigned long publish_interval = 5000; // Publish every 5 seconds

WiFiClient espClient;
PubSubClient client(espClient);

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  
  String message;
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);

  // Parse command JSON
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, message);
  
  if (!error) {
    if (doc.containsKey("threshold")) {
      threshold_weight = doc["threshold"];
      Serial.print("Threshold updated to: ");
      Serial.println(threshold_weight);
    }
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    
    if (client.connect(mqtt_client_id, mqtt_user, mqtt_password)) {
      Serial.println("connected");
      
      // Subscribe to command topic
      client.subscribe(command_topic);
      
      // Publish connection status
      publishStatus("online");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

float readWeight() {
  // Simulate weight reading with some variation
  // In real implementation, this would read from HX711 or similar load cell
  int rawValue = analogRead(WEIGHT_PIN);
  
  // Add some random variation to simulate real sensor
  float noise = (random(-50, 50) / 100.0);
  float weight = (rawValue / 4095.0) * 1000.0 + noise; // Convert to grams
  
  return weight;
}

void publishWeight(float weight) {
  StaticJsonDocument<512> doc;
  
  doc["device_id"] = device_id;
  doc["item_name"] = item_name;
  doc["weight"] = weight;
  doc["threshold"] = threshold_weight;
  doc["status"] = (weight > threshold_weight) ? "OK" : "LOW";
  doc["timestamp"] = millis();
  doc["wifi_rssi"] = WiFi.RSSI();
  
  char buffer[512];
  serializeJson(doc, buffer);
  
  if (client.publish(weight_topic, buffer)) {
    Serial.println("Weight published: " + String(weight) + "g");
  } else {
    Serial.println("Failed to publish weight");
  }
}

void publishStatus(const char* status) {
  StaticJsonDocument<256> doc;
  
  doc["device_id"] = device_id;
  doc["status"] = status;
  doc["ip"] = WiFi.localIP().toString();
  doc["timestamp"] = millis();
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  client.publish(status_topic, buffer);
}

void setup() {
  Serial.begin(115200);
  
  pinMode(WEIGHT_PIN, INPUT);
  
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  
  randomSeed(analogRead(0));
  
  Serial.println("ESP32 Item Reminder initialized");
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  if (now - last_publish > publish_interval) {
    last_publish = now;
    
    current_weight = readWeight();
    publishWeight(current_weight);
  }
}
