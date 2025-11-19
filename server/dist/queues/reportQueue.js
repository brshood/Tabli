import { createQueue } from '../services/queue';
export const reportQueue = createQueue('reports:daily-summary', {
    attempts: 2,
    removeOnComplete: true,
});
