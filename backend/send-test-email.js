#!/usr/bin/env node

/**
 * Send Test Email Script
 * This script actually sends a test email to verify Gmail SMTP configuration
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('\n📧 Sending Test Email to Gmail...\n');
console.log('='.repeat(50));

async function sendTestEmail() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('❌ Email configuration is incomplete!');
    console.log('   Please check your .env file for SMTP settings.');
    return false;
  }

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    console.log('📤 Connecting to SMTP server...');
    console.log(`   Host: ${process.env.SMTP_HOST}`);
    console.log(`   Port: ${process.env.SMTP_PORT}`);
    console.log(`   User: ${process.env.SMTP_USER}`);

    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection verified');

    // Send test email
    console.log('\n📨 Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER, // Send to yourself
      subject: '✅ IoT Item Reminder - Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
          <h2 style="color: #1976d2;">🎉 Test Email Successful!</h2>
          <p>Your email notification system is working correctly.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Test Details:</h3>
            <ul>
              <li><strong>Sent at:</strong> ${new Date().toLocaleString()}</li>
              <li><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</li>
              <li><strong>From:</strong> ${process.env.EMAIL_FROM || process.env.SMTP_USER}</li>
              <li><strong>To:</strong> ${process.env.SMTP_USER}</li>
            </ul>
          </div>

          <p>This confirms that your IoT Item Reminder system can send email notifications for:</p>
          <ul>
            <li>✓ Low weight alerts</li>
            <li>✓ Geofence notifications</li>
            <li>✓ Item status updates</li>
            <li>✓ System alerts</li>
          </ul>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          
          <p style="color: #666; font-size: 12px;">
            This is an automated test email from your IoT Item Reminder system.
          </p>
        </div>
      `
    });

    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   To: ${process.env.SMTP_USER}`);
    console.log('\n📬 Check your inbox (and spam folder) for the test email!');
    
    return true;
  } catch (error) {
    console.log('❌ Failed to send test email');
    console.log(`   Error: ${error.message}`);
    
    if (error.code === 'EAUTH') {
      console.log('\n💡 Authentication failed. Please check:');
      console.log('   1. Your Gmail App Password is correct');
      console.log('   2. 2-Step Verification is enabled in your Google account');
      console.log('   3. You created an App Password (not your regular Gmail password)');
      console.log('   4. Visit: https://myaccount.google.com/apppasswords');
    } else if (error.code === 'ECONNECTION') {
      console.log('\n💡 Connection failed. Please check:');
      console.log('   1. Your internet connection');
      console.log('   2. SMTP host and port are correct');
      console.log('   3. Firewall is not blocking port 587');
    }
    
    return false;
  }
}

// Run the test
console.log('');
sendTestEmail()
  .then(success => {
    console.log('\n' + '='.repeat(50));
    if (success) {
      console.log('\n✅ EMAIL TEST COMPLETED SUCCESSFULLY!\n');
      process.exit(0);
    } else {
      console.log('\n❌ EMAIL TEST FAILED\n');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  });
