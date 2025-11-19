import type { SendEmailOptions } from '../services/email';
import { sendEmail } from '../services/email';
import { createWorker } from '../services/queue';
import '../queues/emailQueue';

createWorker<SendEmailOptions>('email:send', async (job) => {
  await sendEmail(job.data);
});

