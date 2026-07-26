// Keeps stored queue positions in step with the live line and tells the
// affected customers about it. Call this after anything that adds, removes, or
// calls a guest — it replaces the old per-call-site "$inc: -1" patching, which
// used different filters in each place and drifted out of sync.

import { recomputeQueuePositions } from './queuePosition';
import { notificationEmitter } from './notificationEmitter';

export async function renumberQueueAndNotify(restaurantId: string | any): Promise<void> {
  try {
    const changes = await recomputeQueuePositions(restaurantId);

    for (const change of changes) {
      notificationEmitter.notifyReservation(change.reservationId, {
        type: 'reservation_updated',
        reservation: {
          _id: change.reservationId,
          queuePosition: change.queuePosition,
        },
      });
    }

    if (changes.length > 0) {
      console.log('[QUEUE] Renumbered live queue', {
        restaurantId: String(restaurantId),
        updated: changes.length,
      });
    }
  } catch (error) {
    // Never fail the caller's operation because renumbering hiccuped
    console.error('[QUEUE] Failed to renumber queue positions:', {
      restaurantId: String(restaurantId),
      error: error instanceof Error ? error.message : error,
    });
  }
}
