"""
ItemReminderIOT - Python MQTT Client Example

This script demonstrates how to connect to HiveMQ Cloud MQTT broker
using Python and the paho-mqtt library.

Requirements:
    pip install paho-mqtt

Usage:
    python mqtt_client_example.py
"""

import paho.mqtt.client as mqtt
import json
import time
import ssl

# MQTT Configuration (from mqtt_config.json)
MQTT_BROKER = "85e1b192f896482fa682320d8d591396.s1.eu.hivemq.cloud"
MQTT_PORT = 8883
MQTT_USERNAME = "your_username"  # Replace with your HiveMQ username
MQTT_PASSWORD = "your_password"  # Replace with your HiveMQ password

# Topics
TOPIC_REMINDER = "itemreminder/notification"
TOPIC_STATUS = "itemreminder/status"
TOPIC_COMMAND = "itemreminder/command"

# Callback when client connects to broker
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Connected to MQTT Broker!")
        # Subscribe to command topic
        client.subscribe(TOPIC_COMMAND)
        # Publish online status
        client.publish(TOPIC_STATUS, "Python Client Online")
    else:
        print(f"Failed to connect, return code {rc}")

# Callback when message is received
def on_message(client, userdata, msg):
    print(f"Received message on topic {msg.topic}: {msg.payload.decode()}")
    
    if msg.topic == TOPIC_COMMAND:
        try:
            command = json.loads(msg.payload.decode())
            print(f"Command received: {command}")
            # Process command here
        except json.JSONDecodeError:
            print(f"Command: {msg.payload.decode()}")

# Callback when message is published
def on_publish(client, userdata, mid):
    print(f"Message published (mid: {mid})")

def main():
    # Create MQTT client
    client = mqtt.Client(client_id="ItemReminder_Python_001")
    
    # Set username and password
    client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    
    # Enable TLS/SSL
    client.tls_set(cert_reqs=ssl.CERT_REQUIRED, tls_version=ssl.PROTOCOL_TLS)
    
    # Set callbacks
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_publish = on_publish
    
    # Connect to broker
    print(f"Connecting to {MQTT_BROKER}:{MQTT_PORT}...")
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
        
        # Start network loop in a separate thread
        client.loop_start()
        
        # Publish example reminders every 30 seconds
        counter = 0
        while True:
            time.sleep(30)
            counter += 1
            
            reminder_data = {
                "item": f"Example Item {counter}",
                "timestamp": int(time.time()),
                "priority": "medium"
            }
            
            payload = json.dumps(reminder_data)
            print(f"Publishing reminder: {payload}")
            client.publish(TOPIC_REMINDER, payload, qos=1)
            
    except KeyboardInterrupt:
        print("\nDisconnecting...")
        client.publish(TOPIC_STATUS, "Python Client Offline")
        client.loop_stop()
        client.disconnect()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
