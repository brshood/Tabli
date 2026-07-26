// Clears out queue entries nobody is waiting on any more.
//
// This used to run only in a 10-minute window at 1 AM GST and cancel *every*
// active waitlist entry. Two problems: it matched only `mode: 'waitlist'`, so
// entries created through POST /reservations (mode 'reserve' + reservationType
// 'waitlist') were never cleared and piled up as permanently "pending" rows
// that counted as people ahead in line; and a restaurant still serving after
// 1 AM had its live queue wiped mid-service, so guests vanished from the board.
//
// It now expires entries by age instead, so abandoned rows always get cleaned
// up and a guest who joined half an hour ago is never swept away.

import { Reservation } from '../models/Reservation';
import { renumberQueueAndNotify } from '../services/queueSync';

/** Nobody is still sitting in a restaurant queue this long after joining */
export const STALE_QUEUE_HOURS = 6;

export async function sweepStaleQueueEntries(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - STALE_QUEUE_HOURS * 60 * 60 * 1000);

    const staleFilter = {
      status: { $in: ['pending', 'confirmed'] },
      requestedAt: { $lt: cutoff },
      $or: [
        { mode: 'waitlist' },
        { mode: 'reserve', reservationType: 'waitlist' },
      ],
    };

    // Grab the affected restaurants first so we can renumber their lines afterwards
    const stale = await Reservation.find(staleFilter).select({ _id: 1, restaurantId: 1 }).lean();
    if (stale.length === 0) return;

    const result = await Reservation.updateMany(staleFilter, {
      $set: {
        status: 'cancelled',
        leftAt: new Date(),
        queuePosition: null,
        cancellationReason: 'daily_reset',
      },
    });

    console.log(
      `[QUEUE_SWEEP] Expired ${result.modifiedCount} queue entries older than ${STALE_QUEUE_HOURS}h (reason: daily_reset)`
    );

    const restaurantIds = new Set(stale.map((entry: any) => String(entry.restaurantId)));
    for (const restaurantId of restaurantIds) {
      await renumberQueueAndNotify(restaurantId);
    }
  } catch (error) {
    console.error('[QUEUE_SWEEP] Error while expiring stale queue entries:', error);
  }
}
