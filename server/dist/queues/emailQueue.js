import { createQueue } from '../services/queue';
export const emailQueue = createQueue('email:send', {
    attempts: 3,
    removeOnComplete: true,
    backoff: {
        type: 'exponential',
        delay: 5000,
    },
});
