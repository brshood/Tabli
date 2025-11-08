import { env } from '../config/env';
export interface SendSMSOptions {
  to: string;
  message: string;
}

export async function sendSMS(opts: SendSMSOptions): Promise<void> {
  // SMS delivery disabled – log for debugging but do nothing.
  // eslint-disable-next-line no-console
  console.log('[SMS:DISABLED]', { to: opts.to, message: opts.message });
}

