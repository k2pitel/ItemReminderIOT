// Test script to check database content and create test data
const mongoose = require('mongoose');
const User = require('./backend/src/models/User');
const Item = require('./backend/src/models/Item');
const Geofence = require('./backend/src/models/Geofence');
const Alert = require('./backend/src/models/Alert');

async function testDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/itemreminder');
    console.log('✅ Connected to MongoDB');

    // Check existing data
    const userCount = await User.countDocuments();
    const itemCount = await Item.countDocuments();
    const geofenceCount = await Geofence.countDocuments();
    const alertCount = await Alert.countDocuments();

    console.log('\n📊 Database Status:');
    console.log(`Users: ${userCount}`);
    console.log(`Items: ${itemCount}`);
    console.log(`Geofences: ${geofenceCount}`);
    console.log(`Alerts: ${alertCount}`);

    // List all items
    const items = await Item.find().populate('userId', 'email');
    console.log('\n📦 Items in database:');
    items.forEach(item => {
      console.log(`- ${item.name}: ${item.currentWeight}${item.unit} (Status: ${item.status})`);
    });

    // List all geofences
    const geofences = await Geofence.find().populate('userId', 'email').populate('itemId', 'name');
    console.log('\n🌍 Geofences in database:');
    geofences.forEach(geofence => {
      console.log(`- ${geofence.name}: Item=${geofence.itemId?.name || 'None'}, Active=${geofence.active}`);
    });

    // List recent alerts
    const alerts = await Alert.find().sort({ createdAt: -1 }).limit(5);
    console.log('\n🚨 Recent alerts:');
    alerts.forEach(alert => {
      console.log(`- ${alert.type}: ${alert.message} (${alert.severity})`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Database test completed');
  } catch (error) {
    console.error('❌ Database test error:', error);
  }
}

testDatabase();