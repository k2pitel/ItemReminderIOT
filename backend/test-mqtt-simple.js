const mqtt = require('mqtt');

console.log('\n📡 MQTT Weight Message Test\n');
console.log('='.repeat(50));

const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker at localhost:1883');
  
  const message = {
    device_id: 'ESP32_001',
    item_name: 'Coffee',
    weight: 15,
    threshold: 50,
    status: 'LOW',
    wifi_rssi: -45
  };
  
  console.log('\n📤 Publishing weight message to topic: itemreminder/weight');
  console.log('   Device ID:', message.device_id);
  console.log('   Item:', message.item_name);
  console.log('   Weight:', message.weight + 'g');
  console.log('   Threshold:', message.threshold + 'g');
  console.log('   Status:', message.status);
  console.log('   WiFi Signal:', message.wifi_rssi + 'dBm');
  
  client.publish('itemreminder/weight', JSON.stringify(message), (err) => {
    if (err) {
      console.error('\n❌ Failed to publish message:', err.message);
      process.exit(1);
    } else {
      console.log('\n✅ MQTT message sent successfully!');
      console.log('\n📋 What should happen now:');
      console.log('   1. Backend receives the message');
      console.log('   2. Item weight is updated to 15g');
      console.log('   3. Low weight alert is created (15g < 50g)');
      console.log('   4. Email notification is sent');
      console.log('\n📧 Check your email: kevin245312@gmail.com');
      console.log('   Subject: ⚠️ Low Stock Alert - Item Running Low\n');
      console.log('💡 Check backend terminal for processing logs');
      console.log('🌐 Check frontend: http://localhost:3000/alerts\n');
      console.log('='.repeat(50));
    }
    client.end();
    process.exit(0);
  });
});

client.on('error', (err) => {
  console.error('\n❌ MQTT Connection Error:', err.message);
  console.error('\nTroubleshooting:');
  console.error('  1. Ensure MQTT broker is running:');
  console.error('     docker ps | Select-String mosquitto');
  console.error('  2. Or start it:');
  console.error('     docker-compose up mosquitto\n');
  process.exit(1);
});
