import 'dotenv/config';

const required = (value: string | undefined, name: string): string => {
  if (!value || value.trim() === '') throw new Error(`Missing required env var: ${name}`);
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
};



