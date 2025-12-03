const mqtt = require('mqtt');

console.log('\nMQTT Weight Message Test\n');
console.log('='.repeat(50));

const telemetryTopic = 'itemreminder/devices/ESP32_001/weight';
const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
  console.log('Connected to MQTT broker at localhost:1883');
  
  const message = {
    device_id: 'ESP32_001',
    item_name: 'Coffee',
    weight: 15,
    threshold: 50,
    status: 'LOW',
    wifi_rssi: -45
  };
  
  console.log(`\nPublishing weight message to topic: ${telemetryTopic}`);
  console.log('   Device ID:', message.device_id);
  console.log('   Item:', message.item_name);
  console.log('   Weight:', message.weight + 'g');
  console.log('   Threshold:', message.threshold + 'g');
  console.log('   Status:', message.status);
  console.log('   WiFi Signal:', message.wifi_rssi + 'dBm');
  
  client.publish(telemetryTopic, JSON.stringify(message), (err) => {
    if (err) {
      console.error('\nFailed to publish message:', err.message);
      process.exit(1);
    } else {
      console.log('\nMQTT message sent successfully!');
      console.log('\nExpected behavior:');
      console.log('   1. Backend receives the message');
      console.log('   2. Item weight is updated to 15g');
      console.log('   3. Low weight alert is created (15g < 50g)');
      console.log('   4. Email notification is sent (if configured)');
      console.log('\nCheck backend terminal for processing logs');
      console.log('Check frontend: http://localhost:3000/alerts\n');
      console.log('='.repeat(50));
    }
    client.end();
    process.exit(0);
  });
});

client.on('error', (err) => {
  console.error('\nMQTT Connection Error:', err.message);
  console.error('\nTroubleshooting:');
  console.error('  1. Ensure MQTT broker is running:');
  console.error('     docker ps | Select-String mosquitto');
  console.error('  2. Or start it:');
  console.error('     docker-compose up mosquitto\n');
  process.exit(1);
});
