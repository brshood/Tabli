import { createQueue } from '../services/queue';

export interface CleanupJobData {
  restaurantId: string;
}

export const cleanupQueue = createQueue<CleanupJobData>('maintenance:restaurant-cleanup', {
  removeOnComplete: true,
});

