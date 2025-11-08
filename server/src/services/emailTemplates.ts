const BRAND_NAME = 'Tabli';
const BRAND_COLORS = {
  background: '#FAF8F2',
  card: '#FFFFFF',
  primaryText: '#2D2D2B',
  secondaryText: '#5A5E3E',
  accent: '#B8860B',
  border: '#F3E5AB',
};

const SUPPORT_EMAIL_DEFAULT = 'tabli.team@gmail.com';

function renderShell(title: string, body: string, supportEmail: string) {
  const logoHtml = `<div style="font-size:28px;font-weight:700;color:${BRAND_COLORS.primaryText};text-align:center;margin-bottom:24px;letter-spacing:0.08em;">${BRAND_NAME}</div>`;

  const html = `
    <html>
      <body style="margin:0;padding:0;background:${BRAND_COLORS.background};font-family: 'Helvetica Neue', Arial, sans-serif;color:${BRAND_COLORS.primaryText};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;padding:32px 24px;">
          <tr>
            <td>
              ${logoHtml}
              <div style="background:${BRAND_COLORS.card};border-radius:20px;padding:36px 32px;border:1px solid ${BRAND_COLORS.border};box-shadow:0 18px 40px rgba(45,45,43,0.12);">
                <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND_COLORS.primaryText};text-align:center;">${title}</h1>
                ${body}
              </div>
              <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:${BRAND_COLORS.secondaryText};text-align:center;">
                Need assistance? Contact us at <a href="mailto:${supportEmail}" style="color:${BRAND_COLORS.accent};text-decoration:none;">${supportEmail}</a><br/>
                — The ${BRAND_NAME} Team
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `.replace(/\s{2,}/g, ' ');

  return html;
}

interface PasswordResetOtpTemplateParams {
  name: string;
  otp: string;
  validityMinutes?: number;
  supportEmail?: string;
}

export function buildPasswordResetOtpTemplate({
  name,
  otp,
  validityMinutes = 15,
  supportEmail = SUPPORT_EMAIL_DEFAULT,
}: PasswordResetOtpTemplateParams) {
  const subject = `Your ${BRAND_NAME} verification code`;
  const greetingName = name?.trim() ? name.trim() : 'there';

  const text = [
    `Hi ${greetingName},`,
    '',
    `Here is your ${BRAND_NAME} verification code: ${otp}`,
    '',
    `This code expires in ${validityMinutes} minutes. If you didn’t request a password reset, you can safely ignore this email.`,
    '',
    `Need help? Contact us at ${supportEmail}.`,
  ].join('\n');

  const htmlBody = `
    <p style="margin:0 0 20px;font-size:16px;color:${BRAND_COLORS.primaryText};line-height:1.6;">
      Hi ${greetingName},
    </p>
    <p style="margin:0 0 20px;font-size:16px;color:${BRAND_COLORS.primaryText};line-height:1.6;">
      Use the verification code below to reset your password. For your security, this code will expire in <strong>${validityMinutes} minutes</strong>.
    </p>
    <div style="display:inline-block;padding:18px 28px;font-size:32px;font-weight:700;letter-spacing:12px;background:${BRAND_COLORS.background};color:${BRAND_COLORS.accent};border-radius:16px;border:2px dashed ${BRAND_COLORS.accent};margin:4px 0 28px;">
      ${otp}
    </div>
    <p style="margin:0 0 12px;font-size:15px;color:${BRAND_COLORS.secondaryText};line-height:1.6;">
      If you didn’t request this reset, please ignore this email—your account remains secure.
    </p>
  `;

  const html = renderShell('Password reset verification', htmlBody, supportEmail);

  return { subject, text, html };
}

interface ReservationConfirmationTemplateParams {
  name?: string | null;
  restaurantName: string;
  restaurantAddress?: string | null;
  partySize: number;
  mode: 'reserve' | 'waitlist';
  queuePosition?: number | null;
  requestedAt?: Date | string | number;
  supportEmail?: string;
}

function formatDate(value?: Date | string | number) {
  if (!value) return null;
  try {
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } catch {
    return null;
  }
}

export function buildReservationConfirmationTemplate({
  name,
  restaurantName,
  restaurantAddress,
  partySize,
  mode,
  queuePosition,
  requestedAt,
  supportEmail = SUPPORT_EMAIL_DEFAULT,
}: ReservationConfirmationTemplateParams) {
  const subject =
    mode === 'waitlist'
      ? `You're in line for ${restaurantName}`
      : `Reservation received for ${restaurantName}`;

  const greetingName = name?.trim() ? name.trim() : 'there';
  const formattedTime = formatDate(requestedAt);
  const positionText =
    mode === 'waitlist' && typeof queuePosition === 'number'
      ? `<li style="margin:0 0 10px;">Queue position: <strong>#${queuePosition}</strong></li>`
      : '';

  const textLines = [
    `Hi ${greetingName},`,
    '',
    mode === 'waitlist'
      ? `You're in the queue for ${restaurantName}. We'll notify you as soon as your table is ready.`
      : `Thank you for booking with ${restaurantName}. We'll reach out shortly to confirm availability.`,
    '',
    `Party size: ${partySize}`,
    ...(positionText ? [`Queue position: #${queuePosition}`] : []),
    ...(formattedTime ? [`Request time: ${formattedTime}`] : []),
    ...(restaurantAddress ? [`Address: ${restaurantAddress}`] : []),
    '',
    'We look forward to hosting you!',
    '',
    `Need help? Contact us at ${supportEmail}.`,
  ];

  const summaryList = `
    <ul style="list-style:none;padding:0;margin:0 0 24px;font-size:15px;color:${BRAND_COLORS.primaryText};line-height:1.6;">
      <li style="margin:0 0 10px;">Party size: <strong>${partySize}</strong></li>
      ${positionText}
      ${formattedTime ? `<li style="margin:0 0 10px;">Request time: <strong>${formattedTime}</strong></li>` : ''}
      ${
        restaurantAddress
          ? `<li style="margin:0 0 10px;">Location: <strong>${restaurantAddress}</strong></li>`
          : ''
      }
    </ul>
  `;

  const htmlBody = `
    <p style="margin:0 0 20px;font-size:16px;color:${BRAND_COLORS.primaryText};line-height:1.6;">
      Hi ${greetingName},
    </p>
    <p style="margin:0 0 20px;font-size:16px;color:${BRAND_COLORS.primaryText};line-height:1.6;">
      ${
        mode === 'waitlist'
          ? `You're officially in line for <strong>${restaurantName}</strong>. Keep an eye on your phone—we’ll let you know the moment your table is ready.`
          : `Thanks for choosing <strong>${restaurantName}</strong>. We’ve received your reservation and will follow up shortly to confirm the details.`
      }
    </p>
    <div style="border-radius:16px;border:1px solid ${BRAND_COLORS.border};background:${BRAND_COLORS.background};padding:24px;margin:12px 0 28px;">
      <h2 style="margin:0 0 12px;font-size:18px;font-weight:700;color:${BRAND_COLORS.primaryText};">Reservation summary</h2>
      ${summaryList}
    </div>
    <p style="margin:0;font-size:15px;color:${BRAND_COLORS.secondaryText};line-height:1.6;">
      We’re excited to host you soon!
    </p>
  `;

  const html = renderShell('Reservation confirmed', htmlBody, supportEmail);

  return {
    subject,
    text: textLines.join('\n'),
    html,
  };
}

