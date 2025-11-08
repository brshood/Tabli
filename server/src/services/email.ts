import { env } from '../config/env';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid - only set API key if it's valid (starts with "SG.")
if (env.EMAIL_API_KEY && env.EMAIL_API_KEY.startsWith('SG.')) {
  sgMail.setApiKey(env.EMAIL_API_KEY);
} else if (env.EMAIL_API_KEY) {
  // API key exists but is invalid format - log warning but don't set it
  console.warn('[EMAIL] SendGrid API key is invalid (must start with "SG."). Email sending will be disabled.');
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Send email using SendGrid
 */
export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  if (!env.EMAIL_API_KEY || !env.EMAIL_FROM) {
    // eslint-disable-next-line no-console
    console.log('[EMAIL:DEV]', { from: env.EMAIL_FROM, ...opts });
    return;
  }

  try {
    await sgMail.send({
      to: opts.to,
      from: env.EMAIL_FROM!,
      subject: opts.subject,
      text: opts.text || '',
      html: opts.html || opts.text || '',
    });
    // eslint-disable-next-line no-console
    console.log('[EMAIL:SENT]', { to: opts.to, subject: opts.subject });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('[EMAIL:ERROR]', error.message);
    throw error;
  }
}



