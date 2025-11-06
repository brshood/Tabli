import express from 'express';
import { Reservation } from '../models/Reservation';
import { Table } from '../models/Table';

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

// GET /analytics/kpis?restaurantId=xxx
// Returns the 4 key KPI metrics with yesterday comparisons
analyticsRouter.get('/kpis', async (req, res, next) => {
  try {
    const restaurantId = req.query.restaurantId as string;
    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required' });
    }

    const now = new Date();
    
    // Define today's range (midnight to now)
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    // Define yesterday's range
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayStart);
    
    // Get total table count for this restaurant
    const totalTables = await Table.countDocuments({ restaurantId });
    
    // Parallel queries for today's data
    const [todayReservations, todaySeated] = await Promise.all([
      // All reservations created today
      Reservation.countDocuments({ 
        restaurantId, 
        requestedAt: { $gte: todayStart, $lt: new Date() } 
      }),
      
      // Reservations seated today with their wait times
      Reservation.find({ 
        restaurantId, 
        status: 'seated',
        seatedAt: { $gte: todayStart, $lt: new Date() },
        requestedAt: { $exists: true }
      }).select({ requestedAt: 1, seatedAt: 1 }).lean()
    ]);
    
    // Parallel queries for yesterday's data
    const [yesterdayReservations, yesterdaySeated] = await Promise.all([
      Reservation.countDocuments({ 
        restaurantId, 
        requestedAt: { $gte: yesterdayStart, $lt: yesterdayEnd } 
      }),
      
      Reservation.find({ 
        restaurantId, 
        status: 'seated',
        seatedAt: { $gte: yesterdayStart, $lt: yesterdayEnd },
        requestedAt: { $exists: true }
      }).select({ requestedAt: 1, seatedAt: 1 }).lean()
    ]);
    
    // Calculate today's average wait time (in minutes)
    let todayAvgWaitTime = 0;
    if (todaySeated.length > 0) {
      const totalWaitMs = todaySeated.reduce((sum, r: any) => {
        const waitMs = new Date(r.seatedAt).getTime() - new Date(r.requestedAt).getTime();
        return sum + Math.max(0, waitMs); // Ensure non-negative
      }, 0);
      todayAvgWaitTime = Math.round(totalWaitMs / todaySeated.length / 60000); // Convert to minutes
    }
    
    // Calculate yesterday's average wait time
    let yesterdayAvgWaitTime = 0;
    if (yesterdaySeated.length > 0) {
      const totalWaitMs = yesterdaySeated.reduce((sum, r: any) => {
        const waitMs = new Date(r.seatedAt).getTime() - new Date(r.requestedAt).getTime();
        return sum + Math.max(0, waitMs);
      }, 0);
      yesterdayAvgWaitTime = Math.round(totalWaitMs / yesterdaySeated.length / 60000);
    }
    
    // Calculate table turnover (times tables were used today)
    const todayTurnover = totalTables > 0 ? Number((todaySeated.length / totalTables).toFixed(1)) : 0;
    const yesterdayTurnover = totalTables > 0 ? Number((yesterdaySeated.length / totalTables).toFixed(1)) : 0;
    
    // Calculate peak capacity % - find the hour with most simultaneous seated customers
    const todayPeakCapacity = await calculatePeakCapacity(restaurantId, todayStart, now, totalTables);
    const yesterdayPeakCapacity = await calculatePeakCapacity(restaurantId, yesterdayStart, yesterdayEnd, totalTables);
    
    res.json({
      todaysCustomers: {
        value: todayReservations,
        change: todayReservations - yesterdayReservations,
        percentChange: yesterdayReservations > 0 
          ? Number((((todayReservations - yesterdayReservations) / yesterdayReservations) * 100).toFixed(1))
          : 0
      },
      avgWaitTime: {
        value: todayAvgWaitTime,
        change: todayAvgWaitTime - yesterdayAvgWaitTime,
        percentChange: yesterdayAvgWaitTime > 0 
          ? Number((((todayAvgWaitTime - yesterdayAvgWaitTime) / yesterdayAvgWaitTime) * 100).toFixed(1))
          : 0
      },
      tableTurnover: {
        value: todayTurnover,
        change: Number((todayTurnover - yesterdayTurnover).toFixed(1)),
        percentChange: yesterdayTurnover > 0 
          ? Number((((todayTurnover - yesterdayTurnover) / yesterdayTurnover) * 100).toFixed(1))
          : 0
      },
      peakCapacity: {
        value: todayPeakCapacity,
        change: todayPeakCapacity - yesterdayPeakCapacity,
        percentChange: yesterdayPeakCapacity > 0 
          ? Number((((todayPeakCapacity - yesterdayPeakCapacity) / yesterdayPeakCapacity) * 100).toFixed(1))
          : 0
      }
    });
  } catch (err) { next(err); }
});

// Helper function to calculate peak capacity %
async function calculatePeakCapacity(
  restaurantId: string, 
  startDate: Date, 
  endDate: Date, 
  totalTables: number
): Promise<number> {
  if (totalTables === 0) return 0;
  
  // Get all seated reservations in the time range
  const seatedReservations = await Reservation.find({
    restaurantId,
    status: 'seated',
    seatedAt: { $gte: startDate, $lt: endDate }
  }).select({ seatedAt: 1, leftAt: 1 }).lean();
  
  if (seatedReservations.length === 0) return 0;
  
  // Group by hour and count overlapping reservations
  const hourlyOccupancy = new Map<number, number>();
  
  for (const reservation of seatedReservations) {
    const seatedAt = new Date((reservation as any).seatedAt);
    const leftAt = (reservation as any).leftAt ? new Date((reservation as any).leftAt) : new Date();
    
    // For each hour the customer was seated, increment the count
    let currentHour = new Date(seatedAt);
    currentHour.setMinutes(0, 0, 0);
    
    while (currentHour < leftAt) {
      const hourKey = currentHour.getTime();
      hourlyOccupancy.set(hourKey, (hourlyOccupancy.get(hourKey) || 0) + 1);
      currentHour = new Date(currentHour.getTime() + 3600000); // Add 1 hour
    }
  }
  
  // Find the maximum occupancy
  const maxOccupancy = Math.max(...Array.from(hourlyOccupancy.values()), 0);
  
  // Calculate percentage (capped at 100%)
  return Math.min(100, Math.round((maxOccupancy / totalTables) * 100));
}

// GET /analytics/peak-hours?restaurantId=xxx&range=day|week|month
// Returns customer count per hour, focusing on seated customers for accurate traffic patterns
analyticsRouter.get('/peak-hours', async (req, res, next) => {
  try {
    const restaurantId = req.query.restaurantId as string;
    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required' });
    }
    
    const range = (req.query.range as string) || 'day';
    const now = new Date();
    const start = new Date(now);
    
    if (range === 'week') start.setDate(now.getDate() - 7);
    else if (range === 'month') start.setMonth(now.getMonth() - 1);
    else {
      // For 'day' range, use today's start
      start.setHours(0, 0, 0, 0);
    }

    // Aggregate by hour, counting seated customers (more accurate than request time)
    const hourlyData = await Reservation.aggregate([
      { 
        $match: { 
          restaurantId: restaurantId as any,
          seatedAt: { $gte: start, $lte: now },
          status: 'seated'
        } 
      },
      { 
        $project: { 
          hour: { $hour: '$seatedAt' } 
        } 
      },
      { 
        $group: { 
          _id: '$hour', 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Create a map of hour -> count
    const hourMap = new Map<number, number>();
    hourlyData.forEach((item: any) => {
      hourMap.set(item._id, item.count);
    });
    
    // Fill in missing hours with 0 for complete 24-hour view
    const items = [];
    for (let hour = 0; hour < 24; hour++) {
      items.push({
        _id: hour,
        count: hourMap.get(hour) || 0
      });
    }
    
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

// GET /analytics/capacity-realtime?restaurantId=xxx
// Returns current table capacity distribution (occupied vs available)
analyticsRouter.get('/capacity-realtime', async (req, res, next) => {
  try {
    const restaurantId = req.query.restaurantId as string;
    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required' });
    }
    
    // Count tables by status
    const [occupied, available, cleaning] = await Promise.all([
      Table.countDocuments({ restaurantId, status: 'occupied' }),
      Table.countDocuments({ restaurantId, status: 'available' }),
      Table.countDocuments({ restaurantId, status: 'cleaning' })
    ]);
    
    const total = occupied + available + cleaning;
    
    if (total === 0) {
      return res.json({
        occupied: 0,
        available: 0,
        cleaning: 0,
        total: 0,
        occupiedPercent: 0,
        availablePercent: 0,
        cleaningPercent: 0
      });
    }
    
    res.json({
      occupied,
      available,
      cleaning,
      total,
      occupiedPercent: Math.round((occupied / total) * 100),
      availablePercent: Math.round((available / total) * 100),
      cleaningPercent: Math.round((cleaning / total) * 100)
    });
  } catch (err) { next(err); }
});

// GET /analytics/daily?restaurantId=&range=week|month
// Returns per-day totals for the selected window with detailed status breakdown
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
        waiting: { $sum: { $cond: [{ $in: ['$status', ['pending', 'confirmed']] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status','cancelled'] }, 1, 0] } },
        noShow: { $sum: { $cond: [{ $eq: ['$status','no_show'] }, 1, 0] } },
      } },
      { $sort: { _id: 1 } },
    ];

    if (restaurantId) {
      pipeline.unshift({ $match: { restaurantId } });
    }

    const items = await Reservation.aggregate(pipeline);
    res.json({ 
      items: items.map((i: any) => ({ 
        day: i._id, 
        total: i.total, 
        seated: i.seated,
        waiting: i.waiting,
        cancelled: i.cancelled,
        noShow: i.noShow
      })) 
    });
  } catch (err) { next(err); }
});



