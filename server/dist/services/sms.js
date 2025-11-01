import { env } from '../config/env.ts';
import twilio from 'twilio';
let twilioClient = null;
function getTwilioClient() {
    if (!twilioClient && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
        twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    }
    return twilioClient;
}
/**
 * Send SMS using Twilio
 */
export async function sendSMS(opts) {
    const client = getTwilioClient();
    if (!client || !env.TWILIO_PHONE_NUMBER) {
        // eslint-disable-next-line no-console
        console.log('[SMS:DEV]', { to: opts.to, message: opts.message });
        return;
    }
    try {
        await client.messages.create({
            body: opts.message,
            from: env.TWILIO_PHONE_NUMBER,
            to: opts.to,
        });
        // eslint-disable-next-line no-console
        console.log('[SMS:SENT]', { to: opts.to });
    }
    catch (error) {
        // eslint-disable-next-line no-console
        console.error('[SMS:ERROR]', error.message);
        throw error;
    }
}
