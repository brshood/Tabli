import '../queues/maintenanceQueue';
import { createWorker } from '../services/queue';
import { deleteRestaurantProfile } from '../services/restaurantCleanup';
createWorker('maintenance:restaurant-cleanup', async (job) => {
    await deleteRestaurantProfile(job.data.restaurantId);
});
