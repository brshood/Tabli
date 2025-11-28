import nodemailer from 'nodemailer';
import { env } from '../config/env';

let transporter: nodemailer.Transporter | null = null;

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

interface EmailTemplateOptions {
  heading: string;
  intro?: string;
  lines?: string[];
  actionText?: string;
  actionUrl?: string;
  footer?: string;
}

const NOTIFICATIONS_URL = 'https://tabliapp.com/#notifications';

/**
 * Validate if an email address is valid and can be used for sending emails
 * @param email - Email address to validate
 * @returns true if email is valid and not a placeholder, false otherwise
 */
export function isValidEmailForSending(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  // Check for placeholder/empty emails
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || trimmedEmail === '' || trimmedEmail === 'walkin@tabli.app') {
    return false;
  }
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmedEmail);
}

const baseEmailStyles = {
  body: 'margin:0;padding:0;font-family:\'Segoe UI\',Tahoma,sans-serif;background-color:#f7f5ed;color:#2d2d2b;',
  container: 'max-width:520px;margin:0 auto;padding:32px 24px;',
  card: 'background-color:#ffffff;border-radius:16px;padding:32px 28px;box-shadow:0 12px 24px rgba(184, 134, 11, 0.15);border:1px solid rgba(45,45,43,0.08);',
  heading: 'font-size:24px;margin:0 0 16px 0;font-weight:700;color:#2d2d2b;',
  paragraph: 'font-size:15px;line-height:1.6;margin:0 0 18px 0;color:#3f3f3d;',
  buttonWrapper: 'text-align:center;margin:28px 0;',
  button: 'display:inline-block;padding:14px 28px;background-color:#b8860b;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:600;font-size:15px;',
  footer: 'margin-top:24px;font-size:12px;color:#7a7870;text-align:center;',
  link: 'color:#b8860b;text-decoration:none;font-weight:500;',
};

export function buildEmailTemplate(options: EmailTemplateOptions & { includeNotificationsLink?: boolean }): string {
  const {
    heading,
    intro,
    lines = [],
    actionText,
    actionUrl,
    footer,
    includeNotificationsLink = false,
  } = options;

  const paragraphs = [
    intro,
    ...lines,
  ].filter(Boolean).map((text) => `<p style="${baseEmailStyles.paragraph}">${text}</p>`).join('');

  const button = actionText && actionUrl
    ? `<div style="${baseEmailStyles.buttonWrapper}">
        <a href="${actionUrl}" style="${baseEmailStyles.button}">${actionText}</a>
       </div>`
    : '';

  // Add notifications link to footer if requested
  let footerText = footer || '';
  if (includeNotificationsLink) {
    const notificationsLinkText = `You can check up on your reservations <a href="${NOTIFICATIONS_URL}" style="${baseEmailStyles.link}">click here</a>.`;
    footerText = footerText 
      ? `${footerText}<br><br>${notificationsLinkText}`
      : notificationsLinkText;
  }

  const footerBlock = footerText
    ? `<div style="${baseEmailStyles.footer}">${footerText}</div>`
    : '';

  return `
  <body style="${baseEmailStyles.body}">
    <div style="${baseEmailStyles.container}">
      <div style="${baseEmailStyles.card}">
        <h1 style="${baseEmailStyles.heading}">${heading}</h1>
        ${paragraphs}
        ${button}
        ${footerBlock}
      </div>
    </div>
  </body>
  `;
}

async function getTransporter(): Promise<nodemailer.Transporter | null> {
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
      });

      // Verify connection once during initialization
      await transporter.verify();
    } catch (error) {
      transporter = null;
      // eslint-disable-next-line no-console
      console.error('[EMAIL:TRANSPORT_INIT_ERROR]', (error as any)?.message || error);
      return null;
    }
  }

  return transporter;
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



