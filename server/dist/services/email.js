import nodemailer from 'nodemailer';
import { env } from '../config/env';
let transporter = null;
async function getTransporter() {
    if (!env.EMAIL_USERNAME || !env.EMAIL_PASSWORD) {
        return null;
    }
    if (!transporter) {
        try {
            transporter = nodemailer.createTransport({
                host: env.EMAIL_SMTP_HOST,
                port: env.EMAIL_SMTP_PORT,
                secure: env.EMAIL_SMTP_SECURE,
                auth: {
                    user: env.EMAIL_USERNAME,
                    pass: env.EMAIL_PASSWORD,
                },
                tls: env.EMAIL_SMTP_ALLOW_SELF_SIGNED ? { rejectUnauthorized: false } : undefined,
            });
            // Verify connection once during initialization
            await transporter.verify();
        }
        catch (error) {
            if (env.EMAIL_SMTP_ALLOW_SELF_SIGNED) {
                // eslint-disable-next-line no-console
                console.warn('[EMAIL:TRANSPORT_VERIFY_WARNING]', error?.message || error);
            }
            else {
                transporter = null;
                // eslint-disable-next-line no-console
                console.error('[EMAIL:TRANSPORT_INIT_ERROR]', error?.message || error);
                return null;
            }
        }
    }
    return transporter;
}
export async function sendEmail(opts) {
    const transporter = await getTransporter();
    if (!transporter) {
        // eslint-disable-next-line no-console
        console.log('[EMAIL:DEV]', { from: env.EMAIL_FROM || env.EMAIL_USERNAME, ...opts });
        return;
    }
    const fromAddress = env.EMAIL_FROM || env.EMAIL_USERNAME;
    if (!fromAddress) {
        // eslint-disable-next-line no-console
        console.log('[EMAIL:DEV:NO_FROM]', { ...opts });
        return;
    }
    try {
        await transporter.sendMail({
            to: opts.to,
            from: fromAddress,
            subject: opts.subject,
            text: opts.text || '',
            html: opts.html || opts.text || '',
            attachments: opts.attachments,
        });
        // eslint-disable-next-line no-console
        console.log('[EMAIL:SENT]', { to: opts.to, subject: opts.subject });
    }
    catch (error) {
        // eslint-disable-next-line no-console
        console.error('[EMAIL:ERROR]', error?.message || error);
        throw error;
    }
}
