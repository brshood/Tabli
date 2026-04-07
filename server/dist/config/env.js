import 'dotenv/config';
const required = (value, name) => {
    if (!value || value.trim() === '')
        throw new Error(`Missing required env var: ${name}`);
    return value;
};
export const env = {
    NODE_ENV: process.env.NODE_ENV || 'production',
    PORT: Number(process.env.PORT || 8080),
    MONGODB_URI: required(process.env.MONGODB_URI, 'MONGODB_URI'),
    JWT_SECRET: required(process.env.JWT_SECRET, 'JWT_SECRET'),
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_SMTP_HOST: process.env.EMAIL_SMTP_HOST || 'smtp.gmail.com',
    EMAIL_SMTP_PORT: process.env.EMAIL_SMTP_PORT ? Number(process.env.EMAIL_SMTP_PORT) : 465,
    EMAIL_SMTP_SECURE: process.env.EMAIL_SMTP_SECURE ? process.env.EMAIL_SMTP_SECURE === 'true' : true,
    EMAIL_USERNAME: process.env.EMAIL_USERNAME,
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
    TWILIO_MESSAGING_SERVICE_SID: process.env.TWILIO_MESSAGING_SERVICE_SID,
    TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER,
    ADMIN_USERNAME: required(process.env.ADMIN_USERNAME, 'ADMIN_USERNAME'),
    ADMIN_PASSWORD: required(process.env.ADMIN_PASSWORD, 'ADMIN_PASSWORD'),
    // Web Push VAPID keys (generate using: npx web-push generate-vapid-keys)
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:tabli.team@gmail.com',
    // E& Enterprise Nexus SMS configuration
    EAND_API_EMAIL: process.env.EAND_API_EMAIL,
    EAND_API_PASSWORD: process.env.EAND_API_PASSWORD,
    EAND_LOGIN_URL: process.env.EAND_LOGIN_URL || 'https://nexus.eandenterprise.com/api/v1/accounts/users/login',
    EAND_SMS_URL: process.env.EAND_SMS_URL || 'https://nexus.eandenterprise.com/api/v1/sms/send',
    EAND_SENDER_ID: process.env.EAND_SENDER_ID,
    EAND_DR_CALLBACK: process.env.EAND_DR_CALLBACK || 'http://example.com/dr',
    BACKUP_ENCRYPTION_KEY: process.env.BACKUP_ENCRYPTION_KEY,
    BACKUP_OUTPUT_DIR: process.env.BACKUP_OUTPUT_DIR || 'backups',
};
