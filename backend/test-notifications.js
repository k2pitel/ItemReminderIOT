#!/usr/bin/env node

/**
 * Notification Services Test Script
 * 
 * This script helps you test your notification services configuration.
 * Run: node test-notifications.js
 */

require('dotenv').config();
const axios = require('axios');
const nodemailer = require('nodemailer');

console.log('\n🧪 ItemReminderIOT - Notification Services Test\n');
console.log('='.repeat(50));

// Test Email Configuration
async function testEmail() {
  console.log('\n📧 Testing Email Configuration...');
  
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('❌ Email not configured');
    console.log('   Missing: SMTP_HOST, SMTP_USER, or SMTP_PASS');
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.verify();
    console.log('✅ Email configuration is valid');
    
    // Ask if user wants to send a test email
    const testEmail = process.env.SMTP_USER;
    console.log(`   Would send test email to: ${testEmail}`);
    
    return true;
  } catch (error) {
    console.log('❌ Email configuration failed:', error.message);
    return false;
  }
}

// Test Firebase Configuration
async function testFirebase() {
  console.log('\n🔥 Testing Firebase Configuration...');
  
  const hasServerKey = !!process.env.FIREBASE_SERVER_KEY;
  const hasServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const hasEnvCredentials = !!(process.env.FIREBASE_PROJECT_ID && 
                                 process.env.FIREBASE_CLIENT_EMAIL && 
                                 process.env.FIREBASE_PRIVATE_KEY);
  
  if (!hasServerKey && !hasServiceAccount && !hasEnvCredentials) {
    console.log('❌ Firebase not configured');
    console.log('   Missing: FIREBASE_SERVER_KEY or service account credentials');
    return false;
  }

  if (hasServerKey) {
    console.log('✅ Firebase Server Key found (Legacy)');
    console.log('   Note: Consider upgrading to Firebase Admin SDK');
    return true;
  }

  if (hasServiceAccount) {
    console.log('✅ Firebase Service Account path configured');
    try {
      const path = require('path');
      const serviceAccountPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      require(serviceAccountPath);
      console.log('✅ Service account file is valid');
      return true;
    } catch (error) {
      console.log('❌ Service account file error:', error.message);
      return false;
    }
  }

  if (hasEnvCredentials) {
    console.log('✅ Firebase environment credentials configured');
    return true;
  }

  return false;
}

// Test Blynk Configuration
// Main test function
async function runTests() {
  const results = {
    email: await testEmail(),
    firebase: await testFirebase()
  };

  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Test Results Summary:\n');
  console.log(`   Email (SMTP):    ${results.email ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Firebase (FCM):  ${results.firebase ? '✅ PASS' : '❌ FAIL'}`);

  const passCount = Object.values(results).filter(r => r).length;
  const totalCount = Object.keys(results).length;

  console.log('\n' + '='.repeat(50));
  console.log(`\n✨ ${passCount}/${totalCount} notification services configured\n`);

  if (passCount === totalCount) {
    console.log('🎉 All notification services are ready!\n');
  } else {
    console.log('⚠️  Some services need configuration.');
    console.log('   See docs/NOTIFICATION_SETUP.md for setup instructions\n');
  }

  process.exit(passCount === totalCount ? 0 : 1);
}

// Run the tests
runTests().catch(error => {
  console.error('\n❌ Test script error:', error);
  process.exit(1);
});
