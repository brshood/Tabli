// #2 - Hold Expiry Checker Service
// Runs periodically to check for expired holds and cancel them
import { Reservation } from '../models/Reservation';
/**
 * Check for expired holds and automatically cancel them
 * Runs every minute via scheduler in index.ts
 */
export async function checkExpiredHolds() {
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
            // Cancel each expired reservation
            for (const reservation of expiredReservations) {
                reservation.status = 'cancelled';
                reservation.holdStatus = 'expired';
                reservation.leftAt = new Date();
                reservation.cancellationReason = 'hold_expired'; // Track that hold expired
                await reservation.save();
                console.log(`[HOLD_EXPIRY] Cancelled reservation ${reservation._id} due to hold expiry`);
            }
        }
    }
    catch (error) {
        console.error('[HOLD_EXPIRY] Error checking expired holds:', error);
    }
}
