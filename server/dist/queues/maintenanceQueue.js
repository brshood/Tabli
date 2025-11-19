import { createQueue } from '../services/queue';
export const cleanupQueue = createQueue('maintenance:restaurant-cleanup', {
    removeOnComplete: true,
});
