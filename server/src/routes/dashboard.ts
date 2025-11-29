import express from 'express';
import { Reservation } from '../models/Reservation';
import { getTodayStartGST } from '../utils/dateFormat';

export const dashboardRouter = express.Router();

/**
 * GET /dashboard/:restaurantId/summary
 * Returns summary statistics for the dashboard including waiting customers, seated today, and average wait time.
 * 
 * @route GET /dashboard/:restaurantId/summary
 * @param {string} req.params.restaurantId - Restaurant ID
 * @returns {Object} Response with summary data:
 *   - waiting: Number of customers currently waiting (pending or confirmed waitlist)
 *   - seatedToday: Number of customers seated today
 *   - avgWaitMinutes: Average wait time in minutes for customers seated today
 */
dashboardRouter.get('/:restaurantId/summary', async (req, res, next) => {
  try {
    const restaurantId = req.params.restaurantId;
    const todayStart = getTodayStartGST(); // Use GST timezone
    const now = new Date();

    const [waitingCount, seatedToday, seatedDurations] = await Promise.all([
      Reservation.countDocuments({ restaurantId, mode: 'waitlist', status: { $in: ['pending','confirmed'] } }),
      Reservation.countDocuments({ restaurantId, status: 'seated', seatedAt: { $gte: todayStart, $lte: now } }),
      Reservation.find({ restaurantId, status: 'seated', seatedAt: { $gte: todayStart, $lte: now } })
        .select({ requestedAt: 1, seatedAt: 1 })
        .lean(),
    ]);

    let avgWaitMinutes = 0;
    if (seatedDurations.length > 0) {
      const totalMs = seatedDurations.reduce((sum, r: any) => sum + (new Date(r.seatedAt).getTime() - new Date(r.requestedAt).getTime()), 0);
      avgWaitMinutes = Math.round((totalMs / seatedDurations.length) / 60000);
    }

    res.json({ waiting: waitingCount, seatedToday, avgWaitMinutes });
  } catch (err) { next(err); }
});


