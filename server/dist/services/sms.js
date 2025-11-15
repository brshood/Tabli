import { env } from '../config/env';
import twilio from 'twilio';
let twilioClient = null;
function getTwilioClient() {
    if (!twilioClient && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
        twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    }
    return twilioClient;
}
/**
 * Send notification using Twilio (WhatsApp preferred, fallback to SMS)
 */
export async function sendNotification(opts) {
    const client = getTwilioClient();
    if (!client) {
        // eslint-disable-next-line no-console
        console.log('[NOTIFY:DEV]', { to: opts.to, message: opts.message });
        return;
    }
    const hasWhatsApp = Boolean(env.TWILIO_WHATSAPP_NUMBER);
    const hasSms = Boolean(env.TWILIO_PHONE_NUMBER) || Boolean(env.TWILIO_MESSAGING_SERVICE_SID);
    if (!hasWhatsApp && !hasSms) {
        // eslint-disable-next-line no-console
        console.log('[NOTIFY:DEV:NO-CHANNEL]', { to: opts.to, message: opts.message });
        return;
    }
    try {
        if (hasWhatsApp) {
            await client.messages.create({
                body: opts.message,
                from: `whatsapp:${env.TWILIO_WHATSAPP_NUMBER}`,
                to: opts.to.startsWith('whatsapp:') ? opts.to : `whatsapp:${opts.to}`,
            });
            // eslint-disable-next-line no-console
            console.log('[NOTIFY:SENT:WHATSAPP]', { to: opts.to });
            return;
        }
        const payload = {
            body: opts.message,
            to: opts.to,
        };
        if (env.TWILIO_MESSAGING_SERVICE_SID) {
            payload.messagingServiceSid = env.TWILIO_MESSAGING_SERVICE_SID;
        }
        else if (env.TWILIO_PHONE_NUMBER) {
            payload.from = env.TWILIO_PHONE_NUMBER;
        }
        await client.messages.create(payload);
        // eslint-disable-next-line no-console
        console.log('[NOTIFY:SENT:SMS]', { to: opts.to });
    }
    catch (error) {
        // eslint-disable-next-line no-console
        console.error('[NOTIFY:ERROR]', error.message);
        throw error;
    }
}
