import express from 'express';
import mongoose from 'mongoose';
import { Reservation } from '../models/Reservation';
import { Table } from '../models/Table';
import { Restaurant } from '../models/Restaurant';
import { DailySummary, DailySummaryMetrics, TableStat, BusiestTableInfo } from '../models/DailySummary';

export const analyticsRouter = express.Router();

analyticsRouter.get('/platform-metrics', async (_req, res, next) => {
  try {
    const [reservationsTotal, restaurantsTotal, rawPhones, rawEmails, bothContactCount] = await Promise.all([
      Reservation.countDocuments({ status: { $ne: 'cancelled' } }),
      Restaurant.countDocuments({}),
      Reservation.distinct('phone', { phone: { $exists: true, $nin: [null, ''] } }),
      Reservation.distinct('email', { email: { $exists: true, $nin: [null, ''] } }),
      Reservation.countDocuments({
        phone: { $exists: true, $nin: [null, ''] },
        email: { $exists: true, $nin: [null, ''] },
      }),
    ]);

    const normalizeSetSize = (values: unknown[]) => {
      const set = new Set<string>();
      for (const value of values) {
        if (typeof value !== 'string') continue;
        const trimmed = value.trim();
        if (trimmed) set.add(trimmed);
      }
      return set.size;
    };

    const uniquePhoneCount = normalizeSetSize(rawPhones);
    const uniqueEmailCount = normalizeSetSize(rawEmails);
    const totalUsers = Math.max(0, uniquePhoneCount + uniqueEmailCount - bothContactCount);

    res.json({
      reservations: reservationsTotal,
      restaurants: restaurantsTotal,
      users: totalUsers,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Parses a date string and creates a Date object in local timezone.
 * Supports YYYY-MM-DD format or ISO date strings.
 * 
 * @param dateStr - Date string in YYYY-MM-DD format or ISO format
 * @returns Date object set to midnight in local timezone
 * @throws Error if date format is invalid
 */
function parseDateString(dateStr: string): Date {
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // YYYY-MM-DD format - parse as local date to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  } else {
    // Try parsing as ISO string
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format. Use YYYY-MM-DD');
    }
    date.setHours(0, 0, 0, 0);
    return date;
  }
}

/**
 * Checks if there's reservation data available for a given restaurant and date.
 * Validates that the restaurant existed on the target date and has reservation data.
 * 
 * @param restaurantId - The restaurant ID to check
 * @param targetDate - The date to check for data
 * @returns Promise resolving to an object with exists flag and optional message
 */
async function checkDataExists(restaurantId: string, targetDate: Date): Promise<{ exists: boolean; message?: string }> {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    return { exists: false, message: 'Restaurant not found' };
  }

  // Check if restaurant existed on this date
  if (restaurant.createdAt && new Date(restaurant.createdAt) > targetDate) {
    return { exists: false, message: 'Restaurant did not exist on this date' };
  }

  // Check if there's any reservation data for this day
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const hasAnyData = await Reservation.exists({
    restaurantId,
    $or: [
      { requestedAt: { $gte: startOfDay, $lte: endOfDay } },
      { seatedAt: { $gte: startOfDay, $lte: endOfDay } }
    ]
  });

  if (!hasAnyData) {
    return { exists: false, message: 'No reservations found for this date' };
  }

  return { exists: true };
}

/**
 * GET /analytics/overview
 * Returns overview statistics for reservations within a specified time range.
 * 
 * @route GET /analytics/overview
 * @param {string} req.query.restaurantId - Optional restaurant ID filter
 * @param {string} req.query.range - Time range: 'day', 'week', or 'month' (default: 'day')
 * @returns {Object} Response with totals object containing:
 *   - total: Total number of reservations
 *   - confirmed: Number of confirmed reservations
 *   - seated: Number of seated reservations
 *   - cancelled: Number of cancelled reservations
 */
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

/**
 * GET /analytics/kpis
 * Returns the 4 key KPI metrics with yesterday comparisons.
 * 
 * @route GET /analytics/kpis
 * @param {string} req.query.restaurantId - Required restaurant ID
 * @returns {Object} Response with KPI metrics:
 *   - todaysCustomers: Today's customer count with change from yesterday
 *   - avgWaitTime: Average wait time in minutes with change from yesterday
 *   - tableTurnover: Table turnover rate with change from yesterday
 *   - peakCapacity: Peak capacity percentage with change from yesterday
 * Each metric includes value, change, and percentChange fields.
 */
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

/**
 * Calculates the peak capacity percentage for a restaurant within a time range.
 * Finds the hour with the most simultaneous seated customers and calculates
 * the percentage of total tables occupied at that peak.
 * 
 * @param restaurantId - The restaurant ID
 * @param startDate - Start of the time range
 * @param endDate - End of the time range
 * @param totalTables - Total number of tables for the restaurant
 * @returns Promise resolving to peak capacity percentage (0-100)
 */
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

/**
 * GET /analytics/peak-hours
 * Returns customer count per hour, reflecting the number of customers present at each hour.
 * 
 * @route GET /analytics/peak-hours
 * @param {string} req.query.restaurantId - Required restaurant ID
 * @param {string} req.query.range - Time range: 'day', 'week', or 'month' (default: 'day')
 * @returns {Object} Response with items array containing hourly data:
 *   - _id: Hour of day (0-23)
 *   - count: Number of customers present during that hour
 */
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

    // Fetch all reservations that were seated within the date range
    // We need seatedAt and leftAt to calculate presence at each hour
    const matchCondition: any = {
      restaurantId: restaurantId as any,
      status: 'seated',
      seatedAt: { $exists: true }
    };
    
    if (range === 'day') {
      // For today, use today's start to now
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      matchCondition.seatedAt = { $gte: todayStart, $lte: now };
    } else {
      matchCondition.seatedAt = { $gte: start, $lte: now };
    }
    
    // Fetch reservations with seatedAt and leftAt fields
    const reservations = await Reservation.find(matchCondition)
      .select({ seatedAt: 1, leftAt: 1 })
      .lean();
    
    // Initialize hour map with zeros for all 24 hours
    const hourMap = new Map<number, number>();
    for (let hour = 0; hour < 24; hour++) {
      hourMap.set(hour, 0);
    }
    
    // For each reservation, count it in all hours where it was present
    reservations.forEach((reservation: any) => {
      const seatedAt = new Date(reservation.seatedAt);
      const seatedHour = seatedAt.getHours();
      const leftAt = reservation.leftAt ? new Date(reservation.leftAt) : null;
      const leftHour = leftAt ? leftAt.getHours() : null;
      const currentHour = now.getHours();
      
      // Determine the end hour: if not left yet, use current hour; otherwise use left hour
      const endHour = leftHour !== null ? leftHour : currentHour;
      
      // Count this reservation in all hours from seatedHour through endHour
      // Note: A customer seated at hour H and leaving at hour H is still present during hour H
      for (let hour = seatedHour; hour <= endHour; hour++) {
        if (hour >= 0 && hour < 24) {
          hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
        }
      }
    });
    
    // Convert map to array format expected by frontend
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

/**
 * GET /analytics/wait-times
 * Returns average queue position as a proxy for wait times for recent waitlist reservations.
 * 
 * @route GET /analytics/wait-times
 * @param {string} req.query.restaurantId - Optional restaurant ID filter
 * @returns {Object} Response with stats object containing:
 *   - avgQueuePosition: Average queue position for waitlist reservations
 *   - count: Total number of waitlist reservations
 */
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

/**
 * GET /analytics/capacity-realtime
 * Returns current table capacity distribution (occupied vs available).
 * 
 * @route GET /analytics/capacity-realtime
 * @param {string} req.query.restaurantId - Required restaurant ID
 * @returns {Object} Response with table status counts and percentages:
 *   - occupied: Number of occupied tables
 *   - available: Number of available tables
 *   - cleaning: Number of tables being cleaned
 *   - total: Total number of tables
 *   - occupiedPercent: Percentage of tables occupied
 *   - availablePercent: Percentage of tables available
 *   - cleaningPercent: Percentage of tables being cleaned
 */
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

/**
 * GET /analytics/daily
 * Returns per-day totals for the selected window with detailed status breakdown.
 * 
 * @route GET /analytics/daily
 * @param {string} req.query.restaurantId - Required restaurant ID
 * @param {string} req.query.range - Time range: 'week' or 'month' (default: 'week')
 * @returns {Object} Response with items array containing daily data:
 *   - day: Date string in YYYY-MM-DD format
 *   - seated: Number of seated customers on that day
 *   - waiting: Number of waitlist requests on that day
 *   - total: Total number of customers (seated + waiting)
 */
analyticsRouter.get('/daily', async (req, res, next) => {
  try {
    const restaurantId = req.query.restaurantId as string;
    const range = (req.query.range as string) || 'week';
    const now = new Date();
    const start = new Date(now);
    if (range === 'month') start.setMonth(now.getMonth() - 1);
    else start.setDate(now.getDate() - 7);
    start.setHours(0, 0, 0, 0); // Start of day

    // Get all seated reservations and categorize them as reservations or walk-ins
    // Walk-ins are identified by phone === '0000000000'
    // Use find() like peak-hours endpoint for consistency and reliability
    const matchCondition: any = {
      restaurantId: restaurantId as any,
      status: 'seated',
      seatedAt: { $exists: true, $gte: start, $lte: now }
    };

    const reservations = await Reservation.find(matchCondition)
      .select({ seatedAt: 1, phone: 1 })
      .lean();

    // Create maps for easy lookup - group by day
    const reservationsMap = new Map<string, number>();
    const walkInsMap = new Map<string, number>();
    
    reservations.forEach((reservation: any) => {
      if (!reservation.seatedAt) return;
      
      const seatedDate = new Date(reservation.seatedAt);
      // Format as YYYY-MM-DD using UTC to match date string format
      const year = seatedDate.getUTCFullYear();
      const month = String(seatedDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(seatedDate.getUTCDate()).padStart(2, '0');
      const dayStr = `${year}-${month}-${day}`;
      
      // Walk-ins are identified by phone === '0000000000'
      // Everything else (including undefined/null phone) counts as a reservation
      const isWalkIn = reservation.phone === '0000000000';
      
      if (isWalkIn) {
        walkInsMap.set(dayStr, (walkInsMap.get(dayStr) || 0) + 1);
      } else {
        // Count as reservation if phone is not the walk-in placeholder
        // This includes: real phone numbers, email-only reservations (phone undefined), etc.
        reservationsMap.set(dayStr, (reservationsMap.get(dayStr) || 0) + 1);
      }
    });

    // Generate all days in range (use UTC to match MongoDB's $dateToString behavior)
    const items: any[] = [];
    const currentDate = new Date(start);
    // Set to UTC to match MongoDB's date string formatting
    const utcStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
    let currentUtcDate = new Date(utcStart);
    
    while (currentUtcDate <= utcNow) {
      // Format as YYYY-MM-DD using UTC date components to match MongoDB
      const year = currentUtcDate.getUTCFullYear();
      const month = String(currentUtcDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(currentUtcDate.getUTCDate()).padStart(2, '0');
      const dayStr = `${year}-${month}-${day}`;
      
      const reservations = reservationsMap.get(dayStr) || 0;
      const walkIns = walkInsMap.get(dayStr) || 0;
      
      items.push({
        day: dayStr,
        reservations: reservations,
        walkIns: walkIns,
        total: reservations + walkIns
      });
      currentUtcDate.setUTCDate(currentUtcDate.getUTCDate() + 1);
    }

    res.json({ items });
  } catch (err) { next(err); }
});

/**
 * Calculates comprehensive daily summary metrics for a restaurant on a specific date.
 * Includes booking statistics, table performance metrics, and turnaround times.
 * 
 * @param restaurantId - The restaurant ID
 * @param date - The date to calculate metrics for
 * @returns Promise resolving to DailySummaryMetrics object containing:
 *   - totalBookings: Total number of bookings for the day
 *   - seatedGuests: Number of guests seated
 *   - noShows: Number of no-shows
 *   - manuallyAddedCustomers: Number of walk-ins (manually added)
 *   - avgTurnaroundTime: Average table turnaround time in minutes
 *   - busiestTable: Information about the busiest table
 *   - leastBusiestTable: Information about the least busy table
 *   - avgGuestsPerTable: Average number of guests per table
 *   - tableStats: Array of statistics for each table
 */
async function calculateDailySummaryMetrics(
  restaurantId: string,
  date: Date
): Promise<DailySummaryMetrics> {
  // Calculate date range (start and end of day)
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get all reservations for the day (by requestedAt)
  const allReservations = await Reservation.find({
    restaurantId,
    requestedAt: { $gte: startOfDay, $lte: endOfDay }
  }).lean();

  // Get seated reservations for the day (by seatedAt)
  const seatedReservations = await Reservation.find({
    restaurantId,
    status: 'seated',
    seatedAt: { $gte: startOfDay, $lte: endOfDay }
  }).populate('tableId').lean();

  // Calculate basic metrics
  const totalBookings = allReservations.length;
  const seatedGuests = seatedReservations.length;
  const noShows = allReservations.filter((r: any) => r.status === 'no_show').length;
  const manuallyAddedCustomers = allReservations.filter((r: any) => r.phone === '0000000000').length;

  // Calculate table statistics
  const tableStatsMap = new Map<string, {
    tableId: any;
    tableName: string;
    reservations: number;
    totalTimeOccupied: number;
    totalGuests: number;
    turnaroundTimes: number[];
  }>();

  // Get all tables for the restaurant to have table names
  const allTables = await Table.find({ restaurantId }).lean();
  const tableMap = new Map(allTables.map(t => [t._id.toString(), t]));

  // Process seated reservations to calculate table stats
  for (const reservation of seatedReservations) {
    // Safely extract tableId - handle both populated and non-populated cases
    let tableId: string | null = null;
    const tableIdValue = (reservation as any).tableId;
    
    if (tableIdValue) {
      if (typeof tableIdValue === 'object' && tableIdValue._id) {
        tableId = tableIdValue._id.toString();
      } else if (typeof tableIdValue === 'string' && tableIdValue.trim().length > 0) {
        tableId = tableIdValue.trim();
      } else if (tableIdValue && tableIdValue.toString) {
        const idStr = tableIdValue.toString();
        if (idStr && idStr.trim().length > 0) {
          tableId = idStr.trim();
        }
      }
    }
    
    // Skip if no valid tableId
    if (!tableId || tableId === '' || tableId === 'null' || tableId === 'undefined') {
      continue;
    }

    const table = tableMap.get(tableId);
    const tableName = table?.name || `Table ${tableId}`;
    
    // Use table's _id if available, otherwise validate the string tableId is a valid ObjectId format
    let validTableId: any = null;
    if (table?._id) {
      validTableId = table._id;
    } else if (tableId && tableId.match(/^[0-9a-fA-F]{24}$/)) {
      // Only use string tableId if it's a valid ObjectId format
      try {
        validTableId = new mongoose.Types.ObjectId(tableId);
      } catch {
        // Invalid ObjectId format, skip this reservation
        continue;
      }
    }
    
    if (!validTableId) {
      continue; // Skip if we can't get a valid ObjectId
    }

    if (!tableStatsMap.has(tableId)) {
      tableStatsMap.set(tableId, {
        tableId: validTableId,
        tableName,
        reservations: 0,
        totalTimeOccupied: 0,
        totalGuests: 0,
        turnaroundTimes: []
      });
    }

    const stats = tableStatsMap.get(tableId)!;
    stats.reservations++;
    stats.totalGuests += (reservation as any).partySize || 0;

    // Calculate turnaround time (seatedAt to leftAt)
    const seatedAt = new Date((reservation as any).seatedAt);
    const leftAt = (reservation as any).leftAt ? new Date((reservation as any).leftAt) : new Date();
    const turnaroundMs = leftAt.getTime() - seatedAt.getTime();
    const turnaroundMinutes = Math.max(0, Math.round(turnaroundMs / 60000));
    
    stats.totalTimeOccupied += turnaroundMinutes;
    stats.turnaroundTimes.push(turnaroundMinutes);
  }

  // Convert map to array and calculate averages
  const tableStats: TableStat[] = Array.from(tableStatsMap.values()).map(stats => ({
    tableId: stats.tableId,
    tableName: stats.tableName,
    reservations: stats.reservations,
    totalTimeOccupied: stats.totalTimeOccupied,
    totalGuests: stats.totalGuests,
    avgTurnaroundTime: stats.turnaroundTimes.length > 0
      ? Math.round(stats.turnaroundTimes.reduce((a, b) => a + b, 0) / stats.turnaroundTimes.length)
      : 0
  }));

  // Calculate overall average turnaround time
  const allTurnaroundTimes = tableStats.flatMap(ts => {
    const times: number[] = [];
    for (let i = 0; i < ts.reservations; i++) {
      times.push(ts.avgTurnaroundTime);
    }
    return times;
  });
  const avgTurnaroundTime = allTurnaroundTimes.length > 0
    ? Math.round(allTurnaroundTimes.reduce((a, b) => a + b, 0) / allTurnaroundTimes.length)
    : 0;

  // Calculate average guests per table
  const uniqueTablesUsed = new Set(seatedReservations.map((r: any) => 
    (r.tableId?._id?.toString() || r.tableId?.toString())
  ).filter(Boolean));
  const totalGuestsServed = seatedReservations.reduce((sum: number, r: any) => sum + (r.partySize || 0), 0);
  const avgGuestsPerTable = uniqueTablesUsed.size > 0
    ? Number((totalGuestsServed / uniqueTablesUsed.size).toFixed(2))
    : 0;

  // Determine busiest and least busiest tables
  // Using weighted score: reservations × 0.4 + time × 0.3 + guests × 0.3
  let busiestTable: BusiestTableInfo | null = null;
  let leastBusiestTable: BusiestTableInfo | null = null;
  let maxScore = -1;
  let minScore = Infinity;

  // Normalize scores for comparison
  const maxReservations = Math.max(...tableStats.map(ts => ts.reservations), 1);
  const maxTime = Math.max(...tableStats.map(ts => ts.totalTimeOccupied), 1);
  const maxGuests = Math.max(...tableStats.map(ts => ts.totalGuests), 1);

  for (const stat of tableStats) {
    const normalizedReservations = stat.reservations / maxReservations;
    const normalizedTime = stat.totalTimeOccupied / maxTime;
    const normalizedGuests = stat.totalGuests / maxGuests;
    const score = normalizedReservations * 0.4 + normalizedTime * 0.3 + normalizedGuests * 0.3;

    if (score > maxScore) {
      maxScore = score;
      busiestTable = {
        tableId: stat.tableId,
        tableName: stat.tableName,
        reservations: stat.reservations,
        totalTimeOccupied: stat.totalTimeOccupied,
        totalGuests: stat.totalGuests
      };
    }

    if (score < minScore) {
      minScore = score;
      leastBusiestTable = {
        tableId: stat.tableId,
        tableName: stat.tableName,
        reservations: stat.reservations,
        totalTimeOccupied: stat.totalTimeOccupied,
        totalGuests: stat.totalGuests
      };
    }
  }

  // Default values if no tables were used
  if (!busiestTable && tableStats.length > 0) {
    busiestTable = {
      tableId: tableStats[0].tableId,
      tableName: tableStats[0].tableName,
      reservations: tableStats[0].reservations,
      totalTimeOccupied: tableStats[0].totalTimeOccupied,
      totalGuests: tableStats[0].totalGuests
    };
  }

  if (!leastBusiestTable && tableStats.length > 0) {
    leastBusiestTable = {
      tableId: tableStats[tableStats.length - 1].tableId,
      tableName: tableStats[tableStats.length - 1].tableName,
      reservations: tableStats[tableStats.length - 1].reservations,
      totalTimeOccupied: tableStats[tableStats.length - 1].totalTimeOccupied,
      totalGuests: tableStats[tableStats.length - 1].totalGuests
    };
  }

  // Fallback if no data - use null ObjectId instead of empty string
  // We'll need to handle this in the schema to allow null
  const defaultTableInfo: BusiestTableInfo = {
    tableId: null as any, // Use null instead of empty string
    tableName: 'N/A',
    reservations: 0,
    totalTimeOccupied: 0,
    totalGuests: 0
  };

  return {
    totalBookings,
    seatedGuests,
    noShows,
    manuallyAddedCustomers,
    avgTurnaroundTime,
    busiestTable: busiestTable || defaultTableInfo,
    leastBusiestTable: leastBusiestTable || defaultTableInfo,
    avgGuestsPerTable,
    tableStats: tableStats.filter(ts => ts.tableId !== null && ts.tableId !== undefined) // Filter out invalid tableIds
  };
}

/**
 * POST /analytics/daily-summary
 * Generate and store a daily summary for a specific date.
 * 
 * @route POST /analytics/daily-summary
 * @param {string} req.body.restaurantId - Required restaurant ID
 * @param {string} req.body.date - Required date in YYYY-MM-DD or ISO format
 * @returns {Object} Response with summary object containing the generated daily summary
 * @throws {400} If restaurantId or date is missing or invalid
 * @throws {404} If no data exists for the specified date
 * @throws {500} If calculation or saving fails
 */
analyticsRouter.post('/daily-summary', async (req, res, next) => {
  try {
    const { restaurantId, date } = req.body;

    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required' });
    }

    if (!date) {
      return res.status(400).json({ error: 'date is required (ISO date string)' });
    }

    // Parse date string
    let targetDate: Date;
    try {
      targetDate = parseDateString(date);
    } catch (parseError: any) {
      return res.status(400).json({ error: parseError.message });
    }

    // Check if data exists for this date
    const dataCheck = await checkDataExists(restaurantId, targetDate);
    if (!dataCheck.exists) {
      return res.status(404).json({ 
        error: 'No data available', 
        message: dataCheck.message || 'No data found for this date' 
      });
    }

    // Calculate metrics with error handling
    let metrics;
    try {
      metrics = await calculateDailySummaryMetrics(restaurantId, targetDate);
    } catch (calcError: any) {
      console.error('Error calculating daily summary metrics:', calcError);
      return res.status(500).json({ 
        error: 'Failed to calculate metrics', 
        details: calcError.message 
      });
    }

    // Store or update summary
    try {
      const summary = await DailySummary.findOneAndUpdate(
        { restaurantId, date: targetDate },
        { metrics },
        { upsert: true, new: true }
      );

      res.json({ summary });
    } catch (saveError: any) {
      console.error('Error saving daily summary:', saveError);
      return res.status(500).json({ 
        error: 'Failed to save summary', 
        details: saveError.message 
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /analytics/daily-summary/:date
 * Get stored summary for a date, or generate if missing.
 * 
 * @route GET /analytics/daily-summary/:date
 * @param {string} req.params.date - Date in YYYY-MM-DD format
 * @param {string} req.query.restaurantId - Required restaurant ID
 * @returns {Object} Response with summary object containing the daily summary
 * @throws {400} If restaurantId is missing or date format is invalid
 * @throws {404} If no data exists for the specified date
 * @throws {500} If summary generation fails
 */
analyticsRouter.get('/daily-summary/:date', async (req, res, next) => {
  try {
    const restaurantId = req.query.restaurantId as string;
    const dateParam = req.params.date;

    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required' });
    }

    // Parse date string
    let targetDate: Date;
    try {
      targetDate = parseDateString(dateParam);
    } catch (parseError: any) {
      return res.status(400).json({ error: parseError.message });
    }

    // Check if data exists for this date
    const dataCheck = await checkDataExists(restaurantId, targetDate);
    if (!dataCheck.exists) {
      return res.status(404).json({ 
        error: 'No data available', 
        message: dataCheck.message || 'No data found for this date' 
      });
    }

    // Try to find existing summary
    let summary = await DailySummary.findOne({
      restaurantId,
      date: targetDate
    });

    // If not found, generate it
    if (!summary) {
      try {
        const metrics = await calculateDailySummaryMetrics(restaurantId, targetDate);
        summary = await DailySummary.create({
          restaurantId,
          date: targetDate,
          metrics
        });
      } catch (calcError: any) {
        console.error('Error generating summary:', calcError);
        return res.status(500).json({ 
          error: 'Failed to generate summary', 
          details: calcError.message 
        });
      }
    }

    res.json({ summary });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /analytics/daily-summary/pdf/:date
 * Generate PDF report for a specific date.
 * 
 * @route GET /analytics/daily-summary/pdf/:date
 * @param {string} req.params.date - Date in YYYY-MM-DD format
 * @param {string} req.query.restaurantId - Required restaurant ID
 * @returns {Buffer} PDF document as binary data with Content-Type: application/pdf
 * @throws {400} If restaurantId is missing or date format is invalid
 * @throws {404} If no data exists for the specified date
 * @throws {500} If PDF generation fails
 */
analyticsRouter.get('/daily-summary/pdf/:date', async (req, res, next) => {
  try {
    const restaurantId = req.query.restaurantId as string;
    const dateParam = req.params.date;

    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required' });
    }

    // Parse date string
    let targetDate: Date;
    try {
      targetDate = parseDateString(dateParam);
    } catch (parseError: any) {
      return res.status(400).json({ error: parseError.message });
    }

    // Check if data exists for this date
    const dataCheck = await checkDataExists(restaurantId, targetDate);
    if (!dataCheck.exists) {
      return res.status(404).json({ 
        error: 'No data available', 
        message: dataCheck.message || 'No data found for this date' 
      });
    }

    // Get or generate summary
    let summary = await DailySummary.findOne({
      restaurantId,
      date: targetDate
    });

    if (!summary) {
      try {
        const metrics = await calculateDailySummaryMetrics(restaurantId, targetDate);
        summary = await DailySummary.create({
          restaurantId,
          date: targetDate,
          metrics
        });
      } catch (calcError: any) {
        console.error('Error generating summary for PDF:', calcError);
        return res.status(500).json({ 
          error: 'Failed to generate summary', 
          details: calcError.message 
        });
      }
    }

    // Get restaurant info
    const restaurant = await Restaurant.findById(restaurantId);
    const restaurantName = restaurant?.name || 'Restaurant';

    // Generate markdown
    const dateStr = targetDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const { metrics } = summary;
    const hoursOccupied = Math.round(metrics.busiestTable.totalTimeOccupied / 60 * 10) / 10;
    const hoursOccupiedLeast = Math.round(metrics.leastBusiestTable.totalTimeOccupied / 60 * 10) / 10;

    // Safely format table names (handle null tableId cases)
    const busiestTableName = metrics.busiestTable?.tableName || 'N/A';
    const leastBusiestTableName = metrics.leastBusiestTable?.tableName || 'N/A';

    const markdown = `# Daily Summary - ${restaurantName}
## ${dateStr}

### Overview
- **Total Bookings:** ${metrics.totalBookings}
- **Seated Guests:** ${metrics.seatedGuests}
- **No-Shows:** ${metrics.noShows}
- **Manually Added Customers:** ${metrics.manuallyAddedCustomers}

### Performance Metrics
- **Average Turnaround Time:** ${metrics.avgTurnaroundTime} minutes
- **Average Guests Per Table:** ${metrics.avgGuestsPerTable}

### Table Performance

Busiest Table: ${busiestTableName}
- Reservations: ${metrics.busiestTable?.reservations || 0}
- Total Time Occupied: ${hoursOccupied} hours
- Total Guests: ${metrics.busiestTable?.totalGuests || 0}

Least Busiest Table: ${leastBusiestTableName}
- Reservations: ${metrics.leastBusiestTable?.reservations || 0}
- Total Time Occupied: ${hoursOccupiedLeast} hours
- Total Guests: ${metrics.leastBusiestTable?.totalGuests || 0}

### Detailed Table Statistics

${metrics.tableStats && metrics.tableStats.length > 0 ? metrics.tableStats
  .filter(stat => stat.tableId && stat.tableName) // Filter out invalid entries
  .map(stat => {
    const hours = Math.round(stat.totalTimeOccupied / 60 * 10) / 10;
    return `**${stat.tableName}**
- Reservations: ${stat.reservations}
- Total Time Occupied: ${hours} hours
- Total Guests: ${stat.totalGuests}
- Average Turnaround Time: ${stat.avgTurnaroundTime} minutes
`;
  }).join('\n') : 'No table data available for this day.'}

---
*Generated on ${new Date().toLocaleString()}*
`;

    // Dynamically import pdfkit (CommonJS module in ES module context)
    const pdfkitModule = await import('pdfkit');
    const PDFDocument = pdfkitModule.default || pdfkitModule;
    
    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="daily-summary-${dateParam}.pdf"`);
      res.send(pdfBuffer);
    });

    // Parse markdown and render to PDF
    const lines = markdown.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('# ')) {
        // H1 - Title
        doc.fontSize(24).font('Helvetica-Bold').text(trimmed.substring(2), { align: 'center' });
        doc.moveDown(1);
      } else if (trimmed.startsWith('## ')) {
        // H2 - Date
        doc.fontSize(18).font('Helvetica-Bold').text(trimmed.substring(3), { align: 'center' });
        doc.moveDown(1);
      } else if (trimmed.startsWith('### ')) {
        // H3 - Section
        doc.moveDown(0.5);
        doc.fontSize(14).font('Helvetica-Bold').text(trimmed.substring(4));
        doc.moveDown(0.5);
      } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        // Bold text
        const text = trimmed.replace(/\*\*/g, '');
        doc.fontSize(12).font('Helvetica-Bold').text(text);
        doc.moveDown(0.3);
      } else if (trimmed.startsWith('- ')) {
        // Bullet point
        const text = trimmed.substring(2);
        // Handle bold text within bullet points
        const parts = text.split(/(\*\*.*?\*\*)/);
        doc.fontSize(11).font('Helvetica');
        let xPos = 70;
        for (const part of parts) {
          if (part.startsWith('**') && part.endsWith('**')) {
            const boldText = part.replace(/\*\*/g, '');
            doc.font('Helvetica-Bold').text(boldText, { continued: true, indent: 20 });
            doc.font('Helvetica');
          } else if (part.trim()) {
            doc.text(part, { continued: parts.indexOf(part) < parts.length - 1, indent: 20 });
          }
        }
        doc.moveDown(0.2);
      } else if (trimmed === '---') {
        // Horizontal rule
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
      } else if (trimmed.startsWith('*') && trimmed.endsWith('*')) {
        // Italic text
        const text = trimmed.replace(/\*/g, '');
        doc.fontSize(10).font('Helvetica-Oblique').text(text, { align: 'center' });
        doc.moveDown(0.3);
      } else if (trimmed.length > 0) {
        // Regular text
        doc.fontSize(11).font('Helvetica').text(trimmed);
        doc.moveDown(0.2);
      } else {
        // Empty line
        doc.moveDown(0.2);
      }
    }

    doc.end();
  } catch (err) {
    next(err);
  }
});

/**
 * GET /analytics/daily-summaries
 * List all summaries for a date range.
 * 
 * @route GET /analytics/daily-summaries
 * @param {string} req.query.restaurantId - Required restaurant ID
 * @param {string} req.query.startDate - Optional start date in YYYY-MM-DD format
 * @param {string} req.query.endDate - Optional end date in YYYY-MM-DD format
 * @returns {Object} Response with summaries array containing daily summary documents
 * @throws {400} If restaurantId is missing
 */
analyticsRouter.get('/daily-summaries', async (req, res, next) => {
  try {
    const restaurantId = req.query.restaurantId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required' });
    }

    const filter: any = { restaurantId };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const summaries = await DailySummary.find(filter)
      .sort({ date: -1 })
      .select({ restaurantId: 1, date: 1, metrics: 1, createdAt: 1 })
      .lean();

    res.json({ summaries });
  } catch (err) {
    next(err);
  }
});



