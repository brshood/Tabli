import axios from 'axios';
import { env } from '../config/env';
import { getAccessToken } from './eandAuthClient';

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
 * Removes '+' prefix and ensures digits only
 * For external use - simple normalization
 */
export function normalizeMsisdn(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.startsWith("+") ? trimmed.slice(1) : trimmed;
}

/**
 * Internal function to normalize phone number for SMS API
 * Handles UAE number format:
 * - 5xxxxxxxx (9 digits) -> 9715xxxxxxxx
 * - 05xxxxxxxx (10 digits) -> 9715xxxxxxxx (removes leading 0)
 */
function normalizePhoneForSms(phone: string): string {
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
  
  // If it starts with '05' and is 10 digits, remove the leading '0'
  // This handles cases where users type 05xxxxxxxx instead of 5xxxxxxxx
  if (normalized.startsWith('05') && normalized.length === 10) {
    normalized = normalized.slice(1); // Remove the leading '0', now it's 5xxxxxxxx (9 digits)
  }
  
  // If it starts with '5', assume it's a UAE number and prepend '971'
  if (normalized.startsWith('5')) {
    return `971${normalized}`;
  }
  
  // Return as is if it doesn't match expected patterns
  return normalized;
}

/**
 * Call SMS API with a token
 */
async function callSmsApi(token: string, payload: any): Promise<SmsResponse> {
  const res = await axios.post<SmsResponse>(SMS_URL, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    timeout: 10000,
  });
  return res.data;
}

/**
 * Send SMS via E& Enterprise Nexus API
 */
export async function sendSmsViaEand(params: SmsParams): Promise<SmsResponse> {
  // Validate required environment variables
  if (!SENDER_ID) {
    const error = 'EAND_SENDER_ID environment variable is required';
    console.error('[EAND_SMS] Configuration error:', error);
    throw new Error(error);
  }
  
  // Normalize phone number (handles UAE format and removes +)
  const normalizedPhone = normalizePhoneForSms(params.to);
  
  // Validate phone number format (digits only, no +)
  if (!normalizedPhone || !/^\d+$/.test(normalizedPhone)) {
    throw new Error(`Invalid phone number format: must be digits only (got: ${params.to})`);
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
    // Get access token (from cache or new login)
    const token = await getAccessToken();
    
    // Try sending SMS
    const result = await callSmsApi(token, payload);
    
    // Log success (mask phone number for privacy)
    const maskedPhone = normalizedPhone.length > 4 
      ? `${normalizedPhone.slice(0, 2)}****${normalizedPhone.slice(-2)}`
      : '****';
    console.log('[EAND_SMS] SMS sent successfully', {
      txnId: result.txnId,
      statusCode: result.statusCode,
      statusMsg: result.statusMsg,
      clientTxnId: result.clientTxnId,
      recipient: maskedPhone,
    });
    
    return result;
  } catch (err: any) {
    // If token expired (401), retry once with fresh token
    if (err?.response?.status === 401) {
      console.log('[EAND_SMS] Token expired, refreshing and retrying...');
      try {
        const newToken = await getAccessToken(true); // Force refresh
        const result = await callSmsApi(newToken, payload);
        
        // Log success after retry
        const maskedPhone = normalizedPhone.length > 4 
          ? `${normalizedPhone.slice(0, 2)}****${normalizedPhone.slice(-2)}`
          : '****';
        console.log('[EAND_SMS] SMS sent successfully after token refresh', {
          txnId: result.txnId,
          statusCode: result.statusCode,
          statusMsg: result.statusMsg,
          clientTxnId: result.clientTxnId,
          recipient: maskedPhone,
        });
        
        return result;
      } catch (retryErr: any) {
        // Retry also failed
        console.error('[EAND_SMS] Retry after token refresh also failed:', {
          statusCode: retryErr.response?.status,
          error: retryErr.message,
        });
        throw retryErr;
      }
    }
    
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

