import nodemailer from 'nodemailer';
import { env } from '../config/env';
let transporter = null;
const NOTIFICATIONS_URL = 'https://tabliapp.com/#notifications';
/**
 * Validate if an email address is valid and can be used for sending emails
 * @param email - Email address to validate
 * @returns true if email is valid and not a placeholder, false otherwise
 */
export function isValidEmailForSending(email) {
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
export function buildEmailTemplate(options) {
    const { heading, intro, lines = [], actionText, actionUrl, footer, includeNotificationsLink = false, } = options;
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
    // Wrap in proper HTML document structure for better email client compatibility
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${heading}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
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
</html>
  `;
}
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
                // SMTP transport sends emails immediately without queuing
                // No connection pooling - each email is sent immediately
            });
            // Verify connection once during initialization
            await transporter.verify();
        }
        catch (error) {
            transporter = null;
            // eslint-disable-next-line no-console
            console.error('[EMAIL:TRANSPORT_INIT_ERROR]', error?.message || error);
            return null;
        }
    }
    return transporter;
}
export async function sendEmail(opts) {
    const transporter = await getTransporter();
    if (!transporter) {
        const errorMsg = !env.EMAIL_USERNAME || !env.EMAIL_PASSWORD
            ? 'Email service not configured: EMAIL_USERNAME and/or EMAIL_PASSWORD missing'
            : 'Email transporter failed to initialize';
        // eslint-disable-next-line no-console
        console.error('[EMAIL:NOT_CONFIGURED]', errorMsg, { to: opts.to, subject: opts.subject });
        throw new Error(errorMsg);
    }
    const fromAddress = env.EMAIL_FROM || env.EMAIL_USERNAME;
    if (!fromAddress) {
        const errorMsg = 'Email FROM address not configured: EMAIL_FROM and EMAIL_USERNAME both missing';
        // eslint-disable-next-line no-console
        console.error('[EMAIL:NO_FROM]', errorMsg, { to: opts.to, subject: opts.subject });
        throw new Error(errorMsg);
    }
    // Format "From" address with friendly display name
    // Format: "Tabli" <email@example.com> or just email@example.com if no display name needed
    const formattedFrom = fromAddress.includes('<')
        ? fromAddress
        : `"Tabli" <${fromAddress}>`;
    // Construct frontend URL for unsubscribe/list-unsubscribe
    const frontendUrl = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'https://tabliapp.com';
    const unsubscribeUrl = `${frontendUrl}/#notifications?unsubscribe=true`;
    // Build email headers for better deliverability
    const headers = {
        // List-Unsubscribe header helps with spam scoring
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        // Priority headers
        'X-Priority': '3', // Normal priority (1=highest, 3=normal, 5=lowest)
        'Importance': 'normal',
        'Precedence': 'bulk', // Indicates transactional email
        // Message classification
        'X-Auto-Response-Suppress': 'All', // Prevents auto-responders
    };
    // Add Reply-To header if provided, otherwise use from address
    if (opts.replyTo) {
        headers['Reply-To'] = opts.replyTo;
    }
    else {
        headers['Reply-To'] = fromAddress;
    }
    try {
        const result = await transporter.sendMail({
            to: opts.to,
            from: formattedFrom,
            subject: opts.subject,
            text: opts.text || '',
            html: opts.html || opts.text || '',
            headers,
            replyTo: opts.replyTo || fromAddress,
        });
        // eslint-disable-next-line no-console
        console.log('[EMAIL:SENT]', {
            to: opts.to,
            subject: opts.subject,
            messageId: result.messageId,
            accepted: result.accepted,
            rejected: result.rejected,
            response: result.response,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        // eslint-disable-next-line no-console
        console.error('[EMAIL:ERROR]', {
            error: error?.message || error,
            to: opts.to,
            subject: opts.subject,
            code: error?.code,
            response: error?.response
        });
        throw error;
    }
}
