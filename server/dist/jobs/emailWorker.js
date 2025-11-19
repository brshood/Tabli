import { sendEmail } from '../services/email';
import { createWorker } from '../services/queue';
import '../queues/emailQueue';
createWorker('email:send', async (job) => {
    await sendEmail(job.data);
});
