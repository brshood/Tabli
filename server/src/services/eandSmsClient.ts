import axios from 'axios';
import { env } from '../config/env';

export interface SmsParams {
  to: string;              // E.164 without '+', e.g. 971505612301
  text: string;
  category?: "otp" | "promo" | string;
  clientTxnId?: string;    // if omitted, generate a valid one (16–32 chars)
  drCallback?: string;
}

export interface SmsResponse {
  txnId: string;
  campaignId: string;
  statusCode: number;
  statusMsg: string;
  clientTxnId: string;
}

// Read config from env
const SMS_URL = env.EAND_SMS_URL || "https://nexus.eandenterprise.com/api/v1/sms/send";
const ACCESS_TOKEN = env.EAND_ACCESS_TOKEN;
const SENDER_ID = env.EAND_SENDER_ID;
const DR_CALLBACK = env.EAND_DR_CALLBACK || "http://example.com/dr";

/**
 * Generate a safe clientTxnId if not provided
 * Must be between 16 and 32 characters
 */
function generateClientTxnId(provided?: string): string {
  if (provided && provided.length >= 16 && provided.length <= 32) {
    return provided;
  }
  
  // Generate: tabli-<timestamp>-<random> then slice to at most 32 chars
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1e4);
  const generated = `tabli-${timestamp}-${random}`;
  
  // Ensure it's between 16 and 32 characters
  if (generated.length > 32) {
    return generated.slice(0, 32);
  }
  if (generated.length < 16) {
    // Pad if needed (shouldn't happen, but just in case)
    return generated.padEnd(16, '0');
  }
  return generated;
}

/**
 * Normalize phone number to E.164 format without '+'
 * Input format: 5xxxxxxxx (where x is the actual input)
 * Output: 9715xxxxxxxx
 */
export function normalizeMsisdn(phone: string | undefined | null): string | null {
  if (!phone) return null;
  
  // Remove any whitespace, dashes, or other characters
  let normalized = phone.replace(/\D/g, '');
  
  // If it starts with '+', remove it
  if (normalized.startsWith('+')) {
    normalized = normalized.slice(1);
  }
  
  // If it starts with '971', it's already in the correct format
  if (normalized.startsWith('971')) {
    return normalized;
  }
  
  // If it starts with '5', assume it's a UAE number and prepend '971'
  if (normalized.startsWith('5')) {
    return `971${normalized}`;
  }
  
  // If it's already 12 digits and starts with 971, return as is
  if (normalized.length >= 12 && normalized.startsWith('971')) {
    return normalized;
  }
  
  // If it's 9 digits starting with 5, prepend 971
  if (normalized.length === 9 && normalized.startsWith('5')) {
    return `971${normalized}`;
  }
  
  // Return as is if it doesn't match expected patterns
  // The API will validate it
  return normalized;
}

/**
 * Send SMS via E& Enterprise Nexus API
 */
export async function sendSmsViaEand(params: SmsParams): Promise<SmsResponse> {
  // Validate required environment variables
  if (!ACCESS_TOKEN) {
    throw new Error('EAND_ACCESS_TOKEN environment variable is required');
  }
  if (!SENDER_ID) {
    throw new Error('EAND_SENDER_ID environment variable is required');
  }
  
  // Normalize phone number
  const normalizedPhone = normalizeMsisdn(params.to);
  if (!normalizedPhone) {
    throw new Error('Invalid phone number: phone number is required');
  }
  
  // Validate phone number format (digits only, no +)
  if (!/^\d+$/.test(normalizedPhone)) {
    throw new Error(`Invalid phone number format: must be digits only (got: ${normalizedPhone})`);
  }
  
  // Generate clientTxnId if not provided
  const safeClientTxnId = generateClientTxnId(params.clientTxnId);
  
  // Build the exact payload that the API expects
  const payload = {
    msg: params.text,
    recipient: normalizedPhone,
    sender: SENDER_ID,
    category: params.category || "otp",
    clientTxnId: safeClientTxnId,
    drCallback: params.drCallback || DR_CALLBACK,
  };
  
  try {
    const res = await axios.post<SmsResponse>(SMS_URL, payload, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });
    
    // Log success (mask phone number for privacy)
    const maskedPhone = normalizedPhone.length > 4 
      ? `${normalizedPhone.slice(0, 2)}****${normalizedPhone.slice(-2)}`
      : '****';
    console.log('[EAND_SMS] SMS sent successfully', {
      txnId: res.data.txnId,
      statusCode: res.data.statusCode,
      statusMsg: res.data.statusMsg,
      clientTxnId: res.data.clientTxnId,
      recipient: maskedPhone,
    });
    
    return res.data;
  } catch (err: any) {
    // Extract error message from response
    let errorMessage = err.message || 'Unknown error';
    
    if (err.response?.data) {
      const data = err.response.data;
      if (data.message) {
        errorMessage = data.message;
      } else if (data.statusMsg) {
        errorMessage = data.statusMsg;
      } else if (typeof data === 'string') {
        errorMessage = data;
      } else {
        errorMessage = JSON.stringify(data);
      }
    }
    
    // Check for authentication errors
    if (err.response?.status === 401 || err.response?.status === 403) {
      errorMessage = `Authentication failed (${err.response.status}). EAND_ACCESS_TOKEN may be expired or invalid. Please refresh the token.`;
    }
    
    // Log structured error info
    const maskedPhone = normalizedPhone.length > 4 
      ? `${normalizedPhone.slice(0, 2)}****${normalizedPhone.slice(-2)}`
      : '****';
    console.error('[EAND_SMS] Failed to send SMS', {
      error: errorMessage,
      statusCode: err.response?.status,
      statusMsg: err.response?.data?.statusMsg,
      recipient: maskedPhone,
      clientTxnId: safeClientTxnId,
      responseData: err.response?.data,
    });
    
    throw new Error(`EAND_SMS_ERROR: ${errorMessage}`);
  }
}

