// Simple Node.js script to test alert creation
const mongoose = require('mongoose');

// Connect to MongoDB
async function testAlert() {
  try {
    await mongoose.connect('mongodb://admin:password123@localhost:27017/itemreminder?authSource=admin');
    console.log('Connected to MongoDB');

    // Define schemas
    const alertSchema = new mongoose.Schema({
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
      type: { type: String, enum: ['low_weight', 'offline', 'geofence'], required: true },
      severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },
      message: { type: String, required: true },
      read: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now }
    });

    const itemSchema = new mongoose.Schema({
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      deviceId: { type: String, required: true },
      name: { type: String, required: true },
      thresholdWeight: { type: Number, default: 10 },
      currentWeight: { type: Number, default: 0 },
      status: { type: String, enum: ['OK', 'LOW', 'EMPTY', 'OFFLINE'], default: 'OK' }
    });

    const Alert = mongoose.model('Alert', alertSchema);
    const Item = mongoose.model('Item', itemSchema);

    // Create a test item first
    const testItem = new Item({
      userId: new mongoose.Types.ObjectId(),
      deviceId: 'ESP32_001',
      name: 'Test Coffee Container',
      thresholdWeight: 50,
      currentWeight: 15,
      status: 'LOW'
    });
    
    await testItem.save();
    console.log('Test item created:', testItem._id);

    // Create a test alert
    const testAlert = new Alert({
      userId: testItem.userId,
      itemId: testItem._id,
      type: 'low_weight',
      severity: 'warning',
      message: `${testItem.name} is running low (${testItem.currentWeight}g)`,
      read: false
    });

    await testAlert.save();
    console.log('Test alert created:', testAlert._id);
    console.log('Alert message:', testAlert.message);

    // List all alerts
    const alerts = await Alert.find().populate('itemId');
    console.log(`Total alerts in database: ${alerts.length}`);
    
    alerts.forEach(alert => {
      console.log(`- ${alert.message} (${alert.createdAt})`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

testAlert();