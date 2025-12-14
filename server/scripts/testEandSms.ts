/**
 * Test script for E& Enterprise Nexus SMS service
 * 
 * Usage:
 *   tsx scripts/testEandSms.ts
 * 
 * Make sure to set these environment variables:
 *   EAND_API_EMAIL
 *   EAND_API_PASSWORD
 *   EAND_SENDER_ID
 *   EAND_SMS_URL (optional, defaults to production URL)
 *   EAND_DR_CALLBACK (optional)
 *   TEST_SMS_TO (optional, defaults to 9715XXXXXXXX)
 */

import 'dotenv/config';
import { sendSmsViaEand } from '../src/services/eandSmsClient';

async function main() {
  const testPhone = process.env.TEST_SMS_TO || '9715XXXXXXXX';
  
  console.log('Testing E& Enterprise Nexus SMS service...');
  console.log(`Target phone: ${testPhone}`);
  console.log(`SMS URL: ${process.env.EAND_SMS_URL || 'https://nexus.eandenterprise.com/api/v1/sms/send'}`);
  console.log(`Sender ID: ${process.env.EAND_SENDER_ID || 'NOT SET'}`);
  console.log('');
  
  if (!process.env.EAND_API_EMAIL) {
    console.error('❌ ERROR: EAND_API_EMAIL environment variable is required');
    process.exit(1);
  }
  
  if (!process.env.EAND_API_PASSWORD) {
    console.error('❌ ERROR: EAND_API_PASSWORD environment variable is required');
    process.exit(1);
  }
  
  if (!process.env.EAND_SENDER_ID) {
    console.error('❌ ERROR: EAND_SENDER_ID environment variable is required');
    process.exit(1);
  }
  
  // Validate phone number
  if (testPhone === '9715XXXXXXXX' || testPhone.includes('X') || !/^\d+$/.test(testPhone.replace(/\D/g, ''))) {
    console.error('❌ ERROR: TEST_SMS_TO must be a valid phone number (7-15 digits)');
    console.error('   Current value:', testPhone);
    console.error('   Example: Set TEST_SMS_TO=971505612301 in your .env file or environment');
    process.exit(1);
  }
  
  try {
    console.log('Sending test SMS...');
    const res = await sendSmsViaEand({
      to: testPhone,
      text: 'Test SMS from Tabli backend via e& Nexus 🚀',
      category: 'otp',
    });
    
    console.log('');
    console.log('✅ SMS sent successfully!');
    console.log('Response:', JSON.stringify(res, null, 2));
    console.log('');
    console.log(`Transaction ID: ${res.txnId}`);
    console.log(`Campaign ID: ${res.campaignId}`);
    console.log(`Status: ${res.statusMsg} (${res.statusCode})`);
    console.log(`Client Txn ID: ${res.clientTxnId}`);
    
    if (res.statusCode === 0) {
      console.log('');
      console.log('✅ Status code 0 indicates SUCCESS. SMS should be delivered shortly.');
    } else {
      console.log('');
      console.warn(`⚠️  Status code ${res.statusCode} - check API documentation for meaning.`);
    }
  } catch (err: any) {
    console.error('');
    console.error('❌ Failed to send test SMS');
    console.error('Error:', err?.message || err);
    
    if (err.message?.includes('EAND_API_EMAIL') || err.message?.includes('EAND_API_PASSWORD')) {
      console.error('');
      console.error('💡 Tip: Make sure EAND_API_EMAIL and EAND_API_PASSWORD are set in your .env file');
    }
    
    if (err.message?.includes('401') || err.message?.includes('403')) {
      console.error('');
      console.error('💡 Tip: Authentication failed. Check your email and password credentials.');
    }
    
    process.exit(1);
  }
}

main();

