// Test script to create alerts directly
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/itemreminder');

// Alert model
const alertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  type: { type: String, enum: ['low_weight', 'offline', 'geofence'], required: true },
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Alert = mongoose.model('Alert', alertSchema);

// Create test alert
async function createTestAlert() {
  try {
    const alert = new Alert({
      userId: new mongoose.Types.ObjectId(),
      itemId: new mongoose.Types.ObjectId(),
      type: 'low_weight',
      severity: 'warning',
      message: 'Test Alert: Coffee container is running low (15g)',
      read: false
    });
    
    await alert.save();
    console.log('Test alert created:', alert._id);
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error creating alert:', error);
  }
}

createTestAlert();