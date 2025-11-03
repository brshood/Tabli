import express from 'express';
import { Reservation } from '../models/Reservation.ts';

export const analyticsRouter = express.Router();

analyticsRouter.get('/overview', async (req, res, next) => {
  try {
    const restaurantId = req.query.restaurantId as string;
    const range = (req.query.range as string) || 'day';
    const now = new Date();
    const start = new Date(now);
    if (range === 'week') start.setDate(now.getDate() - 7);
    else if (range === 'month') start.setMonth(now.getMonth() - 1);
    else start.setDate(now.getDate() - 1);

    const [totals] = await Reservation.aggregate([
      { $match: { restaurantId: restaurantId ? (restaurantId as any) : { $exists: true }, requestedAt: { $gte: start } } },
      { $group: {
        _id: null,
        total: { $sum: 1 },
        confirmed: { $sum: { $cond: [{ $eq: ['$status','confirmed'] }, 1, 0] } },
        seated: { $sum: { $cond: [{ $eq: ['$status','seated'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status','cancelled'] }, 1, 0] } },
      } },
    ]);
    res.json({ totals: totals || { total: 0, confirmed: 0, seated: 0, cancelled: 0 } });
  } catch (err) { next(err); }
});

analyticsRouter.get('/peak-hours', async (req, res, next) => {
  try {
    const restaurantId = req.query.restaurantId as string;
    const range = (req.query.range as string) || 'day';
    const now = new Date();
    const start = new Date(now);
    if (range === 'week') start.setDate(now.getDate() - 7);
    else if (range === 'month') start.setMonth(now.getMonth() - 1);
    else start.setDate(now.getDate() - 1);

    const items = await Reservation.aggregate([
      { $match: { restaurantId: restaurantId ? (restaurantId as any) : { $exists: true }, requestedAt: { $gte: start } } },
      { $project: { hour: { $hour: '$requestedAt' } } },
      { $group: { _id: '$hour', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ items });
  } catch (err) { next(err); }
});

analyticsRouter.get('/wait-times', async (req, res, next) => {
  try {
    const restaurantId = req.query.restaurantId as string;
    // Naive proxy: average queue position as wait metric for recent waitlist
    const items = await Reservation.aggregate([
      { $match: { restaurantId: restaurantId ? (restaurantId as any) : { $exists: true }, mode: 'waitlist', status: { $in: ['pending','confirmed','seated'] } } },
      { $group: { _id: null, avgQueuePosition: { $avg: '$queuePosition' }, count: { $sum: 1 } } },
    ]);
    const stats = items[0] || { avgQueuePosition: 0, count: 0 };
    res.json({ stats });
  } catch (err) { next(err); }
});

// GET /analytics/daily?restaurantId=&range=week|month
// Returns per-day totals for the selected window
analyticsRouter.get('/daily', async (req, res, next) => {
  try {
    const restaurantId = req.query.restaurantId as string;
    const range = (req.query.range as string) || 'week';
    const now = new Date();
    const start = new Date(now);
    if (range === 'month') start.setMonth(now.getMonth() - 1);
    else start.setDate(now.getDate() - 7);

    const pipeline: any[] = [
      { $match: { requestedAt: { $gte: start } } },
      { $addFields: { day: { $dateToString: { format: '%Y-%m-%d', date: '$requestedAt' } } } },
      { $group: {
        _id: '$day',
        total: { $sum: 1 },
        seated: { $sum: { $cond: [{ $eq: ['$status','seated'] }, 1, 0] } },
      } },
      { $sort: { _id: 1 } },
    ];

    if (restaurantId) {
      pipeline.unshift({ $match: { restaurantId } });
    }

    const items = await Reservation.aggregate(pipeline);
    res.json({ items: items.map((i: any) => ({ day: i._id, total: i.total, seated: i.seated })) });
  } catch (err) { next(err); }
});



