#!/usr/bin/env node

/**
 * Notification Services Test Script
 * 
 * This script helps you test your notification services configuration.
 * Run: node test-notifications.js
 */

require('dotenv').config();
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

// Main test function
async function runTests() {
  const results = {
    email: await testEmail()
  };

  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Test Results Summary:\n');
  console.log(`   Email (SMTP):    ${results.email ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n' + '='.repeat(50));

  if (results.email) {
    console.log('\n🎉 Email notification service is ready!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Email service needs configuration.');
    console.log('   Check your .env file for SMTP settings\n');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('\n❌ Test script error:', error);
  process.exit(1);
});
