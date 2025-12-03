#!/usr/bin/env node

/**
 * Complete MQTT + Email Test
 * This creates a user and item, then sends MQTT message to trigger email
 */

require('dotenv').config();
const mqtt = require('mqtt');
const axios = require('axios');

const config = {
  apiUrl: 'http://localhost:5000/api',
  mqttBroker: 'mqtt://localhost:1883',
  deviceId: 'ESP32_001'
};

const telemetryTopic = `itemreminder/devices/${config.deviceId}/weight`;

let authToken = null;
let userId = null;

console.log('\nComplete MQTT + Email Notification Test');
console.log('='.repeat(60));

// Step 1: Create/Login User
async function setupUser() {
  console.log('\nStep 1: Setting up test user...');
  
  try {
    // Try login first
    const loginResponse = await axios.post(`${config.apiUrl}/auth/login`, {
      username: 'mqtttest',
      password: 'Test123!'
    });
    
    authToken = loginResponse.data.token;
    userId = loginResponse.data.user.id;
    console.log('Logged in as existing user');
    console.log(`   User ID: ${userId}`);
    
  } catch (error) {
    // If login fails, register
    try {
      const registerResponse = await axios.post(`${config.apiUrl}/auth/register`, {
        username: 'mqtttest',
        email: process.env.SMTP_USER || 'test@example.com',
        password: 'Test123!',
        firstName: 'MQTT',
        lastName: 'Test'
      });
      
      authToken = registerResponse.data.token;
      userId = registerResponse.data.user.id;
      console.log('New user created');
      console.log(`   User ID: ${userId}`);
      console.log(`   Email: ${registerResponse.data.user.email}`);
      
    } catch (regError) {
      console.error('Failed to create user:', regError.response?.data || regError.message);
      throw regError;
    }
  }
}

// Step 2: Create Item
async function setupItem() {
  console.log('\nStep 2: Creating item...');
  
  try {
    // First, check if item already exists
    const existingItems = await axios.get(
      `${config.apiUrl}/items`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    const existingItem = existingItems.data.find(item => item.deviceId === config.deviceId);
    
    if (existingItem) {
      console.log('Item already exists');
      console.log(`   ID: ${existingItem._id}`);
      console.log(`   Name: ${existingItem.name}`);
      console.log(`   Device ID: ${existingItem.deviceId}`);
      console.log(`   Threshold: ${existingItem.thresholdWeight}${existingItem.unit}`);
      return existingItem;
    }
    
    // Create new item
    const itemData = {
      deviceId: config.deviceId,
      name: 'Coffee',
      description: 'Test coffee container',
      thresholdWeight: 50,
      unit: 'grams',
      detectionMode: 'weight'
    };
    
    const response = await axios.post(
      `${config.apiUrl}/items`,
      itemData,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    console.log('Item created successfully');
    console.log(`   ID: ${response.data._id}`);
    console.log(`   Name: ${response.data.name}`);
    console.log(`   Device ID: ${response.data.deviceId}`);
    console.log(`   Threshold: ${response.data.thresholdWeight}${response.data.unit}`);
    
    return response.data;
    
  } catch (error) {
    console.error('Failed to create item:', error.response?.data || error.message);
    throw error;
  }
}

// Step 3: Send MQTT Message
async function sendMqttMessage() {
  console.log('\nStep 3: Sending MQTT message...');
  
  return new Promise((resolve, reject) => {
    const client = mqtt.connect(config.mqttBroker);
    
    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      
      const message = {
        device_id: config.deviceId,
        item_name: 'Coffee',
        weight: 15,
        threshold: 50,
        status: 'LOW',
        wifi_rssi: -45
      };
      
      console.log(`Publishing message to ${telemetryTopic}`);
      console.log(`   Device: ${message.device_id}`);
      console.log(`   Weight: ${message.weight}g (Threshold: ${message.threshold}g)`);
      console.log(`   Status: ${message.status}`);
      
      client.publish(telemetryTopic, JSON.stringify(message), (err) => {
        if (err) {
          console.error('Failed to publish:', err.message);
          client.end();
          reject(err);
        } else {
          console.log('MQTT message published');
          console.log('Waiting 3 seconds for backend to process...');
          
          setTimeout(() => {
            client.end();
            resolve();
          }, 3000);
        }
      });
    });
    
    client.on('error', (err) => {
      console.error('MQTT error:', err.message);
      reject(err);
    });
  });
}

// Step 4: Check Alerts
async function checkAlerts() {
  console.log('\nStep 4: Checking for generated alerts...');
  
  try {
    const response = await axios.get(
      `${config.apiUrl}/alerts`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    const alerts = response.data;
    console.log(`Found ${alerts.length} alert(s) in database`);
    
    if (alerts.length > 0) {
      const recentAlert = alerts[0];
      console.log('\nMost Recent Alert:');
      console.log(`   Type: ${recentAlert.type}`);
      console.log(`   Severity: ${recentAlert.severity}`);
      console.log(`   Message: ${recentAlert.message}`);
      console.log(`   Time: ${new Date(recentAlert.createdAt).toLocaleString()}`);
    }
    
  } catch (error) {
    console.error('Failed to fetch alerts:', error.response?.data || error.message);
  }
}

// Main execution
async function runTest() {
  try {
    console.log('Starting complete MQTT + Email test...\n');
    console.log('Make sure backend is running: npm run dev\n');
    
    await setupUser();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await setupItem();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await sendMqttMessage();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await checkAlerts();
    
    console.log('\n' + '='.repeat(60));
    console.log('\nTEST COMPLETED!');
    console.log('\nExpected Email (if SMTP configured):');
    console.log(`   To: ${process.env.SMTP_USER || 'your-email@gmail.com'}`);
    console.log('   Subject: Low Stock Alert - Item Running Low');
    console.log('   Body: Coffee is running low (15g / 50g threshold)');
    console.log('\nActions:');
    console.log('   1. Check your email inbox (and spam folder)');
    console.log('   2. Check backend terminal for processing logs');
    console.log('   3. Check frontend alerts: http://localhost:3000/alerts');
    console.log('\n' + '='.repeat(60) + '\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\nTEST FAILED:', error.message);
    console.error('\nTroubleshooting:');
    console.error('   1. Ensure backend is running: npm run dev');
    console.error('   2. Ensure MongoDB is running');
    console.error('   3. Ensure MQTT broker is running');
    console.error('   4. Check backend logs for errors\n');
    process.exit(1);
  }
}

runTest();
