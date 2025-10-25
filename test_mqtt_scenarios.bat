#!/bin/bash
# Test script for MQTT message scenarios

echo "🧪 Testing MQTT Weight Scenarios"

echo "1. Normal weight (OK status)"
docker exec itemreminder-mqtt mosquitto_pub -h localhost -t "iot/weight" -m '{"deviceId":"ESP32_001","weight":150.5,"timestamp":"2025-10-25T04:05:00Z"}'

sleep 2

echo "2. Low weight (LOW status)"
docker exec itemreminder-mqtt mosquitto_pub -h localhost -t "iot/weight" -m '{"deviceId":"ESP32_001","weight":25.2,"timestamp":"2025-10-25T04:05:30Z"}'

sleep 2

echo "3. Empty weight (EMPTY status)"
docker exec itemreminder-mqtt mosquitto_pub -h localhost -t "iot/weight" -m '{"deviceId":"ESP32_001","weight":2.1,"timestamp":"2025-10-25T04:06:00Z"}'

echo "✅ Test messages sent!"