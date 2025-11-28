// #15 - Daily Reset Cron Job
// Runs at 1:00 AM GST (21:00 UTC previous day) to reset queues
import { Reservation } from '../models/Reservation';
/**
 * Daily reset job that runs at 1 AM GST
 * - Cancels all pending/confirmed waitlist reservations
 * - Resets queue positions
 */
export async function runDailyReset() {
    try {
        console.log('[DAILY_RESET] Starting daily reset at 1 AM GST...');
        // Find all active waitlist reservations
        const activeWaitlistReservations = await Reservation.find({
            mode: 'waitlist',
            status: { $in: ['pending', 'confirmed'] }
        });
        console.log(`[DAILY_RESET] Found ${activeWaitlistReservations.length} active waitlist reservations to cancel`);
        // Cancel all pending/confirmed waitlist reservations with reason tracking
        const result = await Reservation.updateMany({
            mode: 'waitlist',
            status: { $in: ['pending', 'confirmed'] }
        }, {
            $set: {
                status: 'cancelled',
                leftAt: new Date(),
                queuePosition: null,
                cancellationReason: 'daily_reset' // Track that this was an automatic reset
            }
        });
        console.log(`[DAILY_RESET] Reset complete. Cancelled ${result.modifiedCount} reservations (reason: daily_reset)`);
    }
    catch (error) {
        console.error('[DAILY_RESET] Error during daily reset:', error);
    }
}
