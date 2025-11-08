import { env } from '../config/env';
import twilio from 'twilio';

let twilioClient: ReturnType<typeof twilio> | null = null;

function getTwilioClient() {
  if (!twilioClient && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

export interface SendSMSOptions {
  to: string;
  message: string;
}

/**
 * Send SMS using Twilio
 */
export async function sendSMS(opts: SendSMSOptions): Promise<void> {
  const client = getTwilioClient();

  if (!client || (!env.TWILIO_PHONE_NUMBER && !env.TWILIO_MESSAGING_SERVICE_SID)) {
    // eslint-disable-next-line no-console
    console.log('[SMS:DEV]', { to: opts.to, message: opts.message });
    return;
  }

  try {
    const payload: any = {
      body: opts.message,
      to: opts.to,
    };

    if (env.TWILIO_MESSAGING_SERVICE_SID) {
      payload.messagingServiceSid = env.TWILIO_MESSAGING_SERVICE_SID;
    } else if (env.TWILIO_PHONE_NUMBER) {
      payload.from = env.TWILIO_PHONE_NUMBER;
    }

    await client.messages.create(payload);
    // eslint-disable-next-line no-console
    console.log('[SMS:SENT]', { to: opts.to });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('[SMS:ERROR]', error.message);
    throw error;
  }
}

