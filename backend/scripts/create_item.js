// Script to create a test item directly in MongoDB using backend models
// Usage: copy into running backend container and run with `node /app/scripts/create_item.js`

const mongoose = require('mongoose');
const path = require('path');

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@mongodb:27017/itemreminder?authSource=admin';

  console.log('Connecting to', MONGODB_URI);
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const User = require('../src/models/User');
  const Item = require('../src/models/Item');

  // Try to find an existing user
  let user = await User.findOne();
  if (!user) {
    console.log('No user found, creating a test user');
    user = new User({ username: 'testuser', email: 'test@example.com', password: 'password' });
    await user.save();
  }

  const itemData = {
    userId: user._id,
    deviceId: 'ESP32_001',
    name: 'Pills',
    description: 'hej',
    geofenceId: null,
    triggerCondition: 'exit',
    customAlertMessage: '',
    thresholdWeight: 0,
    currentWeight: 0,
    unit: 'grams',
    detectionMode: 'weight',
    notificationsEnabled: false,
    lastReading: new Date(0)
  };

  const existing = await Item.findOne({ userId: user._id, deviceId: itemData.deviceId });
  if (existing) {
    console.log('Item already exists:', existing._id.toString());
    console.log(existing);
  } else {
    const item = new Item(itemData);
    await item.save();
    console.log('Created item:', item._id.toString());
    console.log(item);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
