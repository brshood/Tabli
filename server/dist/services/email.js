import { env } from '../config/env.ts';
import sgMail from '@sendgrid/mail';
// Initialize SendGrid
if (env.EMAIL_API_KEY) {
    sgMail.setApiKey(env.EMAIL_API_KEY);
}
/**
 * Send email using SendGrid
 */
export async function sendEmail(opts) {
    if (!env.EMAIL_API_KEY || !env.EMAIL_FROM) {
        // eslint-disable-next-line no-console
        console.log('[EMAIL:DEV]', { from: env.EMAIL_FROM, ...opts });
        return;
    }
    try {
        await sgMail.send({
            to: opts.to,
            from: env.EMAIL_FROM,
            subject: opts.subject,
            text: opts.text,
            html: opts.html || opts.text,
        });
        // eslint-disable-next-line no-console
        console.log('[EMAIL:SENT]', { to: opts.to, subject: opts.subject });
    }
    catch (error) {
        // eslint-disable-next-line no-console
        console.error('[EMAIL:ERROR]', error.message);
        throw error;
    }
}
