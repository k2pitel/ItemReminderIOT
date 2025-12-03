const mqtt = require('mqtt');

console.log('\nMQTT Docker Network Test\n');
console.log('==================================================');

// Connect to mosquitto container via Docker network host
const client = mqtt.connect('mqtt://host.docker.internal:1883', {
  clientId: 'test_client_' + Math.random().toString(16).substr(2, 8)
});

const telemetryTopic = 'itemreminder/devices/ESP32_001/weight';

client.on('connect', () => {
  console.log('Connected to MQTT broker via Docker network\n');
  
  const message = {
    device_id: 'ESP32_001',
    item_name: 'Pills',
    weight: 15,
    threshold: 1000,
    unit: 'grams',
    status: 'LOW',
    timestamp: new Date().toISOString(),
    wifi_rssi: -45
  };

  console.log(`Publishing to topic: ${telemetryTopic}`);
  console.log('   Device ID:', message.device_id);
  console.log('   Weight:', message.weight + 'g');
  console.log('   Threshold:', message.threshold + 'g');
  console.log('   Status:', message.status);
  
  client.publish(telemetryTopic, JSON.stringify(message), { qos: 1 }, (err) => {
    if (err) {
      console.error('Publish error:', err);
    } else {
      console.log('\nMessage published successfully!');
      console.log('\nExpected behavior:');
      console.log('   1. Backend receives MQTT message');
      console.log('   2. Item weight updated to 15g');
      console.log('   3. Alert created (15g < 1000g threshold)');
      console.log('   4. Email sent if SMTP configured\n');
      console.log('==================================================\n');
    }
    
    setTimeout(() => {
      client.end();
      process.exit(0);
    }, 1000);
  });
});

client.on('error', (error) => {
  console.error('MQTT Connection Error:', error.message);
  process.exit(1);
});
