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
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
  EMAIL_API_KEY: process.env.EMAIL_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
};



