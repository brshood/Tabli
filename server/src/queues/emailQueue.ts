import type { SendEmailOptions } from '../services/email';
import { createQueue } from '../services/queue';

export const emailQueue = createQueue<SendEmailOptions>('email:send', {
  attempts: 3,
  removeOnComplete: true,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
});

