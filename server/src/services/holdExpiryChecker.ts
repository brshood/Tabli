// #2 - Hold Expiry Checker Service
// Runs periodically to release table holds that have run out.
//
// This used to set status='cancelled' on expiry, which meant a guest staff had
// just called silently vanished from every dashboard list 15 minutes later —
// with no staff action, no record on the board, and nothing shown to the guest.
// Staff reported "people in the queue disappearing".
//
// The hold itself still expires (the table is no longer promised), but the guest
// stays visible so staff can seat them late or remove them deliberately.

import { Reservation } from '../models/Reservation';
import { notificationEmitter } from './notificationEmitter';

/**
 * Mark holds whose window has passed as expired.
 * Runs every minute via scheduler in index.ts
 */
export async function checkExpiredHolds(): Promise<void> {
  try {
    const now = new Date();

    // Find all reservations with active holds that have expired
    const expiredReservations = await Reservation.find({
      holdStatus: 'active',
      holdUntil: { $lt: now },
      status: 'confirmed'
    });

    if (expiredReservations.length > 0) {
      console.log(`[HOLD_EXPIRY] Found ${expiredReservations.length} expired holds`);

      for (const reservation of expiredReservations) {
        // Release the hold only — the guest keeps their place on the staff board
        reservation.holdStatus = 'expired';
        await reservation.save();

        notificationEmitter.notifyReservation((reservation._id as any).toString(), {
          type: 'reservation_updated',
          reservation: {
            _id: (reservation._id as any).toString(),
            status: reservation.status,
            holdStatus: reservation.holdStatus,
            holdUntil: reservation.holdUntil,
          },
        });

        console.log(`[HOLD_EXPIRY] Hold expired for reservation ${reservation._id} (kept on staff board)`);
      }
    }
  } catch (error) {
    console.error('[HOLD_EXPIRY] Error checking expired holds:', error);
  }
}
