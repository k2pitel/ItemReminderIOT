const mqtt = require('mqtt');

console.log('\nMQTT Subscription Test\n');
console.log('='.repeat(50));
console.log('Listening on itemreminder/devices/+/weight and related topics\n');

const client = mqtt.connect('mqtt://localhost:1883');
const topics = [
  'itemreminder/devices/+/weight',
  'itemreminder/devices/+/status',
  'itemreminder/devices/+/command',
  'itemreminder/command', // broadcast commands for legacy support
  'itemreminder/#' // catch-all for quick debugging
];

client.on('connect', () => {
  console.log('Connected to MQTT broker at localhost:1883');
  topics.forEach((topic) => {
    console.log(`Subscribing to: ${topic}`);
    client.subscribe(topic, (err) => {
      if (err) {
        console.error(`Subscribe error for ${topic}:`, err.message);
      }
    });
  });
  console.log('\nListening for messages... (Press Ctrl+C to stop)\n');
});

client.on('message', (topic, message) => {
  console.log(`Message received on "${topic}":`);
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
  console.error('\nMQTT Error:', err.message);
  process.exit(1);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\nClosing connection...');
  client.end();
  process.exit(0);
});
