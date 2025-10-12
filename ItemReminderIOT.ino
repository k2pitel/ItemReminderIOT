/*
 * ItemReminderIOT - MQTT Example for ESP32/ESP8266
 * 
 * This example demonstrates how to connect to HiveMQ Cloud MQTT broker
 * and publish/subscribe to topics for item reminder notifications.
 * 
 * Hardware: ESP32 or ESP8266 with WiFi
 * Libraries Required:
 *   - PubSubClient (by Nick O'Leary)
 *   - WiFiClientSecure (built-in for ESP32/ESP8266)
 */

#include <WiFi.h>           // For ESP32
// #include <ESP8266WiFi.h> // For ESP8266
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include "mqtt_config.h"

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT credentials (from your HiveMQ Cloud cluster)
const char* mqtt_username = "your_mqtt_username";
const char* mqtt_password = "your_mqtt_password";

// Client ID (should be unique for each device)
const char* mqtt_client_id = "ItemReminder_ESP32_001";

WiFiClientSecure espClient;
PubSubClient client(espClient);

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

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
  
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);
  
  // Handle different topics
  if (String(topic) == MQTT_TOPIC_COMMAND) {
    // Process commands here
    Serial.println("Command received: " + message);
  }
}

void reconnect() {
  // Loop until we're reconnected
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    
    // Attempt to connect with credentials
    if (client.connect(mqtt_client_id, mqtt_username, mqtt_password)) {
      Serial.println("connected");
      
      // Subscribe to topics
      client.subscribe(MQTT_TOPIC_COMMAND);
      
      // Publish connection status
      client.publish(MQTT_TOPIC_STATUS, "ItemReminder Device Online");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  
  setup_wifi();
  
  // Set MQTT server
  client.setServer(MQTT_BROKER, MQTT_PORT);
  client.setCallback(callback);
  
  // For TLS connection, you may need to set the root CA certificate
  // espClient.setInsecure(); // Only for testing! Use proper certificates in production
  // For production, use:
  // espClient.setCACert(root_ca);
  
  // Note: For HiveMQ Cloud, you need to use TLS. 
  // In production, provide the CA certificate instead of using setInsecure()
  espClient.setInsecure(); // WARNING: Only for testing
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  
  // Example: Send a reminder every 30 seconds
  static unsigned long lastMsg = 0;
  unsigned long now = millis();
  if (now - lastMsg > 30000) {
    lastMsg = now;
    
    String reminder = "{\"item\":\"Example Item\",\"timestamp\":" + String(now) + "}";
    Serial.print("Publishing reminder: ");
    Serial.println(reminder);
    client.publish(MQTT_TOPIC_REMINDER, reminder.c_str());
  }
}
