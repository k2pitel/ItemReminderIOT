require('dotenv').config();
const mongoose = require('mongoose');
const alertService = require('./src/services/alertService');
const logger = require('./src/utils/logger');

async function testEmailNotification() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/itemreminder');
    logger.info('Connected to MongoDB');

    // Create test alert for Jacket (ESP32_002)
    const alert1 = await alertService.createAlert({
      userId: '691afee348921c5808c8d3c3',
      itemId: '69258802c06c916921b11050',
      type: 'geofence',
      severity: 'warning',
      message: 'TEST ALERT: Don\'t forget your jacket! You are leaving the geofence.',
      data: {
        geofenceName: 'Someone else home',
        itemName: 'Jacket',
        triggerType: 'exit'
      }
    });
    
    logger.info('✅ Test alert created for Jacket:', alert1._id);

    // Create test alert for Creatin (ESP32_004)
    const alert2 = await alertService.createAlert({
      userId: '691afee348921c5808c8d3c3',
      itemId: '6929fef8e6e2f3bd4afa5eee',
      type: 'geofence',
      severity: 'warning',
      message: 'TEST ALERT: Remember your daily creatin! You are entering the geofence.',
      data: {
        geofenceName: 'Someone else home',
        itemName: 'Creatin',
        triggerType: 'enter'
      }
    });
    
    logger.info('✅ Test alert created for Creatin:', alert2._id);
    
    console.log('\n========================================');
    console.log('✅ Test emails sent successfully!');
    console.log('📧 Check your inbox: kevin245312@gmail.com');
    console.log('========================================\n');
    
    process.exit(0);
  } catch (error) {
    logger.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testEmailNotification();
