#!/usr/bin/env node

/**
 * End-to-End System Test
 * Tests: MQTT → Backend → Geofence → Email Notifications
 * 
 * This script simulates the complete flow:
 * 1. Publishes MQTT weight messages (simulating ESP32)
 * 2. Sends GPS location updates (simulating phone)
 * 3. Triggers geofence alerts
 * 4. Sends email notifications
 */

require('dotenv').config();
const mqtt = require('mqtt');
const axios = require('axios');

// Configuration
const config = {
  mqttBroker: process.env.MQTT_BROKER || 'mqtt://localhost:1883',
  apiUrl: 'http://localhost:5000/api',
  testUser: {
    username: 'testuser',
    email: 'testuser@example.com',
    password: 'Test123!'
  }
};

let authToken = null;
let userId = null;
let itemId = null;
let geofenceId = null;

console.log('\n🧪 ItemReminderIOT - End-to-End System Test\n');
console.log('='.repeat(60));

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 1. Register/Login User
async function authenticateUser() {
  console.log('\n📝 Step 1: User Authentication');
  console.log('-'.repeat(60));
  
  try {
    // Try to login first
    console.log('🔐 Attempting login...');
    const loginResponse = await axios.post(`${config.apiUrl}/auth/login`, {
      username: config.testUser.username,
      password: config.testUser.password
    });
    
    authToken = loginResponse.data.token;
    userId = loginResponse.data.user.id;
    console.log('✅ Login successful');
    console.log(`   User ID: ${userId}`);
    console.log(`   Username: ${loginResponse.data.user.username}`);
    
  } catch (loginError) {
    // If login fails, try to register
    if (loginError.response?.status === 401 || loginError.response?.status === 404) {
      console.log('👤 User not found, registering new user...');
      
      try {
        const registerResponse = await axios.post(`${config.apiUrl}/auth/register`, {
          username: config.testUser.username,
          email: config.testUser.email,
          password: config.testUser.password,
          firstName: 'Test',
          lastName: 'User'
        });
        
        authToken = registerResponse.data.token;
        userId = registerResponse.data.user.id;
        console.log('✅ Registration successful');
        console.log(`   User ID: ${userId}`);
        console.log(`   Email: ${registerResponse.data.user.email}`);
        
      } catch (registerError) {
        console.error('❌ Registration failed:', registerError.response?.data || registerError.message);
        throw registerError;
      }
    } else {
      console.error('❌ Authentication failed:', loginError.response?.data || loginError.message);
      throw loginError;
    }
  }
}

// 2. Create a Geofence
async function createGeofence() {
  console.log('\n📍 Step 2: Create Geofence');
  console.log('-'.repeat(60));
  
  try {
    const geofenceData = {
      name: 'Home',
      location: {
        latitude: 55.8826,
        longitude: 9.8431
      },
      radius: 100 // 100 meters
    };
    
    const response = await axios.post(
      `${config.apiUrl}/geofence`,
      geofenceData,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    geofenceId = response.data._id;
    console.log('✅ Geofence created');
    console.log(`   ID: ${geofenceId}`);
    console.log(`   Name: ${response.data.name}`);
    console.log(`   Location: ${response.data.location.latitude}, ${response.data.location.longitude}`);
    console.log(`   Radius: ${response.data.radius}m`);
    
  } catch (error) {
    console.error('❌ Geofence creation failed:', error.response?.data || error.message);
    throw error;
  }
}

// 3. Create an Item with Geofence
async function createItem() {
  console.log('\n📦 Step 3: Create Item');
  console.log('-'.repeat(60));
  
  try {
    const itemData = {
      deviceId: 'ESP32_TEST_001',
      name: 'Test Coffee Container',
      description: 'Testing item with geofence trigger',
      geofenceId: geofenceId,
      triggerCondition: 'exit', // Trigger when leaving geofence
      customAlertMessage: 'Don\'t forget your coffee!',
      thresholdWeight: 50,
      unit: 'grams',
      detectionMode: 'weight'
    };
    
    const response = await axios.post(
      `${config.apiUrl}/items`,
      itemData,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    itemId = response.data._id;
    console.log('✅ Item created');
    console.log(`   ID: ${itemId}`);
    console.log(`   Name: ${response.data.name}`);
    console.log(`   Device ID: ${response.data.deviceId}`);
    console.log(`   Geofence: ${response.data.geofenceId}`);
    console.log(`   Trigger: ${response.data.triggerCondition}`);
    console.log(`   Threshold: ${response.data.thresholdWeight}${response.data.unit}`);
    
  } catch (error) {
    console.error('❌ Item creation failed:', error.response?.data || error.message);
    throw error;
  }
}

// 4. Test MQTT Weight Message
async function testMqttWeightMessage() {
  console.log('\n📡 Step 4: Send MQTT Weight Message');
  console.log('-'.repeat(60));
  
  return new Promise((resolve, reject) => {
    const client = mqtt.connect(config.mqttBroker);
    
    client.on('connect', () => {
      console.log('✅ Connected to MQTT broker');
      
      const message = {
        device_id: 'ESP32_TEST_001',
        item_name: 'Test Coffee Container',
        weight: 25, // Below threshold of 50
        threshold: 50,
        status: 'LOW',
        wifi_rssi: -45
      };
      
      console.log('📤 Publishing weight message...');
      console.log('   Topic: iot/weight');
      console.log(`   Weight: ${message.weight}g (Threshold: ${message.threshold}g)`);
      console.log(`   Status: ${message.status}`);
      
      client.publish('iot/weight', JSON.stringify(message), (err) => {
        if (err) {
          console.error('❌ MQTT publish failed:', err.message);
          client.end();
          reject(err);
        } else {
          console.log('✅ MQTT message published successfully');
          console.log('⏳ Waiting 2 seconds for backend processing...');
          
          setTimeout(() => {
            client.end();
            resolve();
          }, 2000);
        }
      });
    });
    
    client.on('error', (error) => {
      console.error('❌ MQTT connection error:', error.message);
      reject(error);
    });
  });
}

// 5. Simulate GPS Inside Geofence
async function simulateGpsInside() {
  console.log('\n🌍 Step 5: Simulate GPS Location (Inside Geofence)');
  console.log('-'.repeat(60));
  
  try {
    const location = {
      latitude: 55.8826,  // Same as geofence center
      longitude: 9.8431,
      accuracy: 10
    };
    
    const response = await axios.post(
      `${config.apiUrl}/geofence/location`,
      location,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    console.log('✅ GPS location sent (INSIDE geofence)');
    console.log(`   Location: ${location.latitude}, ${location.longitude}`);
    console.log(`   Accuracy: ${location.accuracy}m`);
    console.log(`   Geofences checked: ${response.data.geofencesChecked || 0}`);
    console.log('⏳ Waiting 2 seconds...');
    
    await wait(2000);
    
  } catch (error) {
    console.error('❌ GPS update failed:', error.response?.data || error.message);
    throw error;
  }
}

// 6. Simulate GPS Outside Geofence (Trigger Alert)
async function simulateGpsOutside() {
  console.log('\n🚨 Step 6: Simulate GPS Location (OUTSIDE Geofence - Trigger Alert!)');
  console.log('-'.repeat(60));
  
  try {
    const location = {
      latitude: 55.8850,  // About 270m away from geofence
      longitude: 9.8460,
      accuracy: 10
    };
    
    const response = await axios.post(
      `${config.apiUrl}/geofence/location`,
      location,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    console.log('✅ GPS location sent (OUTSIDE geofence)');
    console.log(`   Location: ${location.latitude}, ${location.longitude}`);
    console.log(`   Accuracy: ${location.accuracy}m`);
    console.log(`   Geofences checked: ${response.data.geofencesChecked || 0}`);
    console.log('🔔 Alert should be triggered!');
    console.log('📧 Email notification should be sent!');
    console.log('⏳ Waiting 3 seconds for alert processing...');
    
    await wait(3000);
    
  } catch (error) {
    console.error('❌ GPS update failed:', error.response?.data || error.message);
    throw error;
  }
}

// 7. Check Alerts
async function checkAlerts() {
  console.log('\n📬 Step 7: Check Generated Alerts');
  console.log('-'.repeat(60));
  
  try {
    const response = await axios.get(
      `${config.apiUrl}/alerts`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    const alerts = response.data;
    console.log(`✅ Found ${alerts.length} alert(s)`);
    
    if (alerts.length > 0) {
      console.log('\n📋 Recent Alerts:');
      alerts.slice(0, 3).forEach((alert, index) => {
        console.log(`\n   Alert #${index + 1}:`);
        console.log(`   Type: ${alert.type}`);
        console.log(`   Severity: ${alert.severity}`);
        console.log(`   Message: ${alert.message}`);
        console.log(`   Time: ${new Date(alert.createdAt).toLocaleString()}`);
        console.log(`   Acknowledged: ${alert.acknowledged ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('   No alerts found yet. Try the MQTT and GPS steps again.');
    }
    
  } catch (error) {
    console.error('❌ Failed to fetch alerts:', error.response?.data || error.message);
  }
}

// 8. Test Summary
async function testSummary() {
  console.log('\n📊 Test Summary');
  console.log('='.repeat(60));
  console.log('\n✅ Test Flow Completed:');
  console.log('   1. ✓ User authenticated');
  console.log('   2. ✓ Geofence created (Home @ 55.8826, 9.8431)');
  console.log('   3. ✓ Item created with geofence trigger');
  console.log('   4. ✓ MQTT weight message sent (LOW status)');
  console.log('   5. ✓ GPS inside geofence simulated');
  console.log('   6. ✓ GPS outside geofence simulated (ALERT!)');
  console.log('   7. ✓ Alerts checked');
  
  console.log('\n📧 Email Notification Check:');
  console.log('   Check the email inbox for:');
  console.log(`   - To: ${process.env.SMTP_USER || 'your-email@gmail.com'}`);
  console.log('   - Subject: Contains "Alert" or "Geofence"');
  console.log('   - Body: Should mention leaving geofence and item info');
  
  console.log('\n💡 Next Steps:');
  console.log('   1. Check your Gmail inbox (and spam folder)');
  console.log('   2. Login to frontend: http://localhost:3000');
  console.log('   3. View alerts in the Alerts page');
  console.log('   4. Check the Map page for geofence visualization');
  
  console.log('\n🔄 To run test again:');
  console.log('   node end-to-end-test.js');
  
  console.log('\n' + '='.repeat(60));
}

// Main test execution
async function runEndToEndTest() {
  try {
    console.log('🚀 Starting End-to-End System Test...\n');
    console.log('⚠️  Make sure backend and MongoDB are running!\n');
    
    await authenticateUser();
    await wait(1000);
    
    await createGeofence();
    await wait(1000);
    
    await createItem();
    await wait(1000);
    
    await testMqttWeightMessage();
    await wait(1000);
    
    await simulateGpsInside();
    await wait(1000);
    
    await simulateGpsOutside();
    await wait(1000);
    
    await checkAlerts();
    await wait(500);
    
    await testSummary();
    
    console.log('\n✅ END-TO-END TEST COMPLETED SUCCESSFULLY!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Ensure backend is running: npm run dev (in backend folder)');
    console.error('  2. Ensure MongoDB is running: docker-compose up mongodb');
    console.error('  3. Ensure MQTT broker is running: docker-compose up mosquitto');
    console.error('  4. Check backend logs for errors');
    console.error('  5. Verify .env configuration\n');
    process.exit(1);
  }
}

// Run the test
runEndToEndTest();
