import type { CleanupJobData } from '../queues/maintenanceQueue';
import '../queues/maintenanceQueue';
import { createWorker } from '../services/queue';
import { deleteRestaurantProfile } from '../services/restaurantCleanup';

createWorker<CleanupJobData>('maintenance:restaurant-cleanup', async (job) => {
  await deleteRestaurantProfile(job.data.restaurantId);
});

