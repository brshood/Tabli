import nodemailer from 'nodemailer';
import { env } from '../config/env';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

let transporterPromise: Promise<nodemailer.Transporter> | null = null;

async function getTransporter(): Promise<nodemailer.Transporter | null> {
  if (!env.EMAIL_USERNAME || !env.EMAIL_PASSWORD) {
    return null;
  }

  if (!transporterPromise) {
    transporterPromise = nodemailer.createTransport({
      host: env.EMAIL_SMTP_HOST,
      port: env.EMAIL_SMTP_PORT,
      secure: env.EMAIL_SMTP_SECURE,
      auth: {
        user: env.EMAIL_USERNAME,
        pass: env.EMAIL_PASSWORD,
      },
    });
  }

  try {
    return await transporterPromise;
  } catch (error) {
    transporterPromise = null;
    // eslint-disable-next-line no-console
    console.error('[EMAIL:TRANSPORT_INIT_ERROR]', (error as any)?.message || error);
    return null;
  }
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
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
    });
    // eslint-disable-next-line no-console
    console.log('[EMAIL:SENT]', { to: opts.to, subject: opts.subject });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('[EMAIL:ERROR]', error?.message || error);
    throw error;
  }
}



