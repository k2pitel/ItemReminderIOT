// MQTT Configuration for ItemReminderIOT
// HiveMQ Cloud MQTT Broker Configuration

#ifndef MQTT_CONFIG_H
#define MQTT_CONFIG_H

// MQTT Broker Details
#define MQTT_BROKER "85e1b192f896482fa682320d8d591396.s1.eu.hivemq.cloud"
#define MQTT_PORT 8883
#define MQTT_WEBSOCKET_PORT 8884

// TLS/SSL Connection
#define MQTT_USE_TLS true

// Connection URLs
// For standard MQTT over TLS: 85e1b192f896482fa682320d8d591396.s1.eu.hivemq.cloud:8883
// For WebSocket over TLS: 85e1b192f896482fa682320d8d591396.s1.eu.hivemq.cloud:8884/mqtt

// TODO: Add your MQTT credentials here
// #define MQTT_USERNAME "your_username"
// #define MQTT_PASSWORD "your_password"

// Topic Configuration
#define MQTT_TOPIC_REMINDER "itemreminder/notification"
#define MQTT_TOPIC_STATUS "itemreminder/status"
#define MQTT_TOPIC_COMMAND "itemreminder/command"

#endif // MQTT_CONFIG_H
