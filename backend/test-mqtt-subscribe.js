const mqtt = require('mqtt');

console.log('\n🔍 MQTT Subscription Test\n');
console.log('='.repeat(50));
console.log('This will listen for messages on itemreminder/weight');
console.log('Keep this running and send messages from another terminal\n');

const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker at localhost:1883');
  console.log('📡 Subscribing to: itemreminder/weight');
  console.log('📡 Subscribing to: itemreminder/status');
  console.log('\n⏳ Listening for messages... (Press Ctrl+C to stop)\n');
  
  client.subscribe('itemreminder/#', (err) => {
    if (err) {
      console.error('❌ Subscribe error:', err.message);
    } else {
      console.log('✅ Subscribed to itemreminder/#');
      console.log('='.repeat(50) + '\n');
    }
  });
});

client.on('message', (topic, message) => {
  console.log(`📨 Message received on "${topic}":`);
  console.log('   Raw:', message.toString());
  
  try {
    const data = JSON.parse(message.toString());
    console.log('   Parsed:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.log('   (Not JSON)');
  }
  
  console.log('');
});

client.on('error', (err) => {
  console.error('\n❌ MQTT Error:', err.message);
  process.exit(1);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Closing connection...');
  client.end();
  process.exit(0);
});
