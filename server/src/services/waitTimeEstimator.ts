import mongoose from 'mongoose';
import { Reservation } from '../models/Reservation';
import { Table } from '../models/Table';
import { getTodayStartGST, nowGST, getDaysAgoStartGST } from '../utils/dateFormat';
import { buildActiveQueueFilter, positionsForQueue } from './queuePosition';
import { buildLiveSeatedFilter } from './liveOccupancy';

const DEFAULT_DWELL_MINUTES = 45;
const DEFAULT_SEED_WAIT_MINUTES = 20; // Default seed wait time when no history exists
const HISTORY_WINDOW_DAYS = 30;
const PREP_BUFFER_MINUTES = 2;
const CLEANING_BUFFER_MINUTES = 5;
const MIN_WAIT_MINUTES = 0;
const MIN_DWELL_MINUTES = 10;
const MAX_DWELL_MINUTES = 180;
const MAX_WAIT_TIME_MINUTES = 120; // #15 - Maximum wait time (2 hours)

type DwellStats = {
  avgDwell: number;
  count: number;
};

type QueueEstimate = {
  reservationId: string;
  queuePosition: number;
  partySize: number;
  estimatedWaitMinutes: number;
  estimatedSeatTime: string;
};

export interface WaitTimeEstimation {
  generatedAt: string;
  restaurantId: string;
  queueLength: number;
  availableTableCount: number;
  occupiedTableCount: number;
  averageDwellMinutes: number;
  queueEstimates: QueueEstimate[];
  nextPartyEstimate?: {
    partySize: number;
    estimatedWaitMinutes: number;
    estimatedSeatTime: string;
  };
}

interface EstimateOptions {
  partySize?: number;
}

const clampDwell = (minutes: number): number => {
  if (!Number.isFinite(minutes)) return DEFAULT_DWELL_MINUTES;
  return Math.min(Math.max(minutes, MIN_DWELL_MINUTES), MAX_DWELL_MINUTES);
};

const createObjectId = (id: string): mongoose.Types.ObjectId | null => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
};

/**
 * Get average wait time seed for a restaurant on a new day
 * Looks up previous day's average wait time, or uses default if no history exists
 * Returns 0 if today already has checkout data (signal to use actual data instead of seed)
 */
async function getWaitTimeSeed(restaurantId: mongoose.Types.ObjectId): Promise<number> {
  const todayStart = getTodayStartGST();
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  
  // Check if we have any checkout data for today (seated + leftAt)
  // Once we have checkouts, we can calculate today's actual average, so don't use seed
  const todayCheckouts = await Reservation.countDocuments({
    restaurantId,
    status: 'seated',
    seatedAt: { $gte: todayStart, $lt: todayEnd },
    leftAt: { $exists: true, $ne: null, $gte: todayStart, $lt: todayEnd },
  });
  
  // If we have checkouts for today, return 0 (signal to use actual data, not seed)
  if (todayCheckouts > 0) {
    return 0; // Signal to use actual data instead of seed
  }
  
  // Look for previous day's average wait time (time from requestedAt to seatedAt)
  // Try yesterday first, then go back up to 7 days
  for (let daysBack = 1; daysBack <= 7; daysBack++) {
    const checkDateStart = getDaysAgoStartGST(daysBack);
    const checkDateEnd = new Date(checkDateStart.getTime() + 24 * 60 * 60 * 1000);
    
    // Get seated reservations from that day to calculate average wait time
    const prevDaySeated = await Reservation.find({
      restaurantId,
      status: 'seated',
      seatedAt: { $gte: checkDateStart, $lt: checkDateEnd },
      requestedAt: { $exists: true },
    })
      .select({ requestedAt: 1, seatedAt: 1 })
      .lean();
    
    if (prevDaySeated.length > 0) {
      // Calculate average wait time: time from requestedAt to seatedAt
      const waitTimes = prevDaySeated
        .map((r: any) => {
          if (!r.seatedAt || !r.requestedAt) return null;
          const waitMs = new Date(r.seatedAt).getTime() - new Date(r.requestedAt).getTime();
          return waitMs > 0 ? Math.round(waitMs / 60000) : null; // Convert to minutes
        })
        .filter((val): val is number => val !== null && val > 0);
      
      if (waitTimes.length > 0) {
        const avgWaitMinutes = Math.round(
          waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length
        );
        if (avgWaitMinutes > 0) {
          return avgWaitMinutes;
        }
      }
    }
  }
  
  // No historical data found, use default seed (20 minutes)
  return DEFAULT_SEED_WAIT_MINUTES;
}

/**
 * Estimate wait times for the current queue in a restaurant by simulating table availability
 * using historical dwell times and the live state of occupied tables.
 */
export async function estimateWaitTimes(
  restaurantId: string,
  options: EstimateOptions = {}
): Promise<WaitTimeEstimation> {
  const restaurantObjectId = createObjectId(restaurantId);
  if (!restaurantObjectId) {
    throw new Error('Invalid restaurant id');
  }

  const now = nowGST();
  const nowMs = now.getTime();
  const historyWindowStart = getDaysAgoStartGST(HISTORY_WINDOW_DAYS);
  
  // Get wait time seed for new day (if no checkouts today yet)
  const waitTimeSeed = await getWaitTimeSeed(restaurantObjectId);

  const [waitlist, seatedReservations, tables, dwellAgg] = await Promise.all([
    // Same definition of "waiting in line" the queue positions use, so estimates
    // cover customers who joined through the booking flow too (mode 'reserve'
    // with reservationType 'waitlist'), and both agree on the order.
    Reservation.find(buildActiveQueueFilter(restaurantId))
      .sort({ requestedAt: 1, _id: 1 })
      .lean(),
    // Parties still at a table right now. Without this, every guest who ever sat
    // down stays in the list and shows up as a phantom table about to free up.
    Reservation.find(buildLiveSeatedFilter(restaurantId, now)).lean(),
    Table.find({ restaurantId }).lean(),
    Reservation.aggregate([
      {
        $match: {
          restaurantId: restaurantObjectId,
          seatedAt: { $exists: true, $ne: null, $gte: historyWindowStart },
          leftAt: { $exists: true, $ne: null, $gte: historyWindowStart },
        },
      },
      {
        $project: {
          partySize: {
            $cond: [
              { $and: [{ $isNumber: '$partySize' }, { $gt: ['$partySize', 0] }] },
              '$partySize',
              2,
            ],
          },
          dwellMinutes: {
            $divide: [{ $subtract: ['$leftAt', '$seatedAt'] }, 60000],
          },
        },
      },
      {
        $match: {
          dwellMinutes: { $gt: 0, $lt: MAX_DWELL_MINUTES * 3 },
        },
      },
      {
        $facet: {
          byParty: [
            {
              $group: {
                _id: '$partySize',
                avgDwell: { $avg: '$dwellMinutes' },
                count: { $sum: 1 },
              },
            },
          ],
          overall: [
            {
              $group: {
                _id: null,
                avgDwell: { $avg: '$dwellMinutes' },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]),
  ]);

  // Report each guest's live index in the line rather than whatever number was
  // stored when they joined, so the estimate and the queue never disagree.
  const livePositions = positionsForQueue(waitlist as any[]);
  const positionOf = (reservation: any, index: number) =>
    livePositions.get(String(reservation._id)) ?? index + 1;

  const dwellMap = new Map<number, DwellStats>();
  let overallAvg = DEFAULT_DWELL_MINUTES;
  if (dwellAgg.length > 0) {
    const byParty = dwellAgg[0]?.byParty ?? [];
    const overall = dwellAgg[0]?.overall ?? [];
    byParty.forEach((entry: any) => {
      if (!entry || typeof entry._id !== 'number') return;
      dwellMap.set(entry._id, {
        avgDwell: clampDwell(entry.avgDwell),
        count: entry.count ?? 0,
      });
    });
    if (overall[0]?.avgDwell) {
      overallAvg = clampDwell(overall[0].avgDwell);
    }
  }

  const getAverageDwell = (partySize: number): number => {
    if (partySize <= 0) partySize = 2;
    const direct = dwellMap.get(partySize);
    if (direct) {
      return clampDwell(direct.avgDwell);
    }
    let closestAvg: number | null = null;
    let minDiff = Infinity;
    for (const [size, stats] of dwellMap.entries()) {
      const diff = Math.abs(size - partySize);
      if (diff < minDiff) {
        minDiff = diff;
        closestAvg = stats.avgDwell;
      }
    }
    if (closestAvg !== null) {
      return clampDwell(closestAvg);
    }
    return clampDwell(overallAvg);
  };

  const prepBufferMs = PREP_BUFFER_MINUTES * 60000;
  const cleaningBufferMs = CLEANING_BUFFER_MINUTES * 60000;

  const availabilityTimeline: number[] = [];

  // A table counts as taken only while a live party is sitting at it. Reading
  // Table.status here instead would permanently hide tables left at 'occupied'
  // by a seating that was never checked out.
  const occupiedTableIds = new Set(
    seatedReservations.map((reservation: any) => String(reservation.tableId)),
  );
  const cleaningTables = tables.filter((table) => table.status === 'cleaning');
  const availableTables = tables.filter(
    (table) => table.status !== 'cleaning' && !occupiedTableIds.has(String(table._id)),
  );

  // Available tables can seat immediately (after a small prep buffer)
  for (let i = 0; i < availableTables.length; i += 1) {
    availabilityTimeline.push(nowMs + prepBufferMs);
  }

  // Cleaning tables need a bit more time before being ready
  for (let i = 0; i < cleaningTables.length; i += 1) {
    availabilityTimeline.push(nowMs + cleaningBufferMs);
  }

  // Occupied tables will free up when the current party is expected to leave
  seatedReservations.forEach((reservation) => {
    if (!reservation.seatedAt) return;
    const seatedAtMs = new Date(reservation.seatedAt).getTime();
    const elapsedMinutes = Math.max(0, (nowMs - seatedAtMs) / 60000);
    const avgDwell = getAverageDwell(reservation.partySize ?? 2);
    const remainingMinutes = Math.max(MIN_WAIT_MINUTES, avgDwell - elapsedMinutes);
    const releaseMs = nowMs + remainingMinutes * 60000 + prepBufferMs;
    availabilityTimeline.push(releaseMs);
  });

  // Without any table data, derive a fallback timeline so we can still return estimates
  // Use wait time seed if available (for new days), otherwise use dwell time average
  if (availabilityTimeline.length === 0 && waitlist.length > 0) {
    const fallbackMinutes = waitTimeSeed > 0 ? waitTimeSeed : overallAvg;
    availabilityTimeline.push(nowMs + fallbackMinutes * 60000);
  }

  availabilityTimeline.sort((a, b) => a - b);

  const queueEstimates: QueueEstimate[] = [];
  const safeOverallAvg = clampDwell(overallAvg);

  waitlist.forEach((reservation, index) => {
    const partySize = reservation.partySize ?? 2;
    const nextAvailability = availabilityTimeline.shift();

    if (typeof nextAvailability !== 'number') {
      const fallbackWait = clampDwell((index + 1) * safeOverallAvg);
      const seatMs = nowMs + fallbackWait * 60000;
      queueEstimates.push({
        reservationId: (reservation._id as any)?.toString?.() ?? '',
        queuePosition: positionOf(reservation, index),
        partySize,
        estimatedWaitMinutes: Math.round(fallbackWait),
        estimatedSeatTime: new Date(seatMs).toISOString(),
      });

      const nextMs = seatMs + safeOverallAvg * 60000 + prepBufferMs;
      availabilityTimeline.push(nextMs);
      availabilityTimeline.sort((a, b) => a - b);
      return;
    }

    // #15 - Cap wait time at 120 minutes
    const waitMinutes = Math.min(
      MAX_WAIT_TIME_MINUTES,
      Math.max(
        MIN_WAIT_MINUTES,
        Math.ceil((nextAvailability - nowMs) / 60000),
      )
    );

    queueEstimates.push({
      reservationId: (reservation._id as any)?.toString?.() ?? '',
      queuePosition: positionOf(reservation, index),
      partySize,
      estimatedWaitMinutes: waitMinutes,
      estimatedSeatTime: new Date(nextAvailability).toISOString(),
    });

    // After seating this party, predict when the table will free up again
    const avgDwell = getAverageDwell(partySize);
    const nextMs = nextAvailability + avgDwell * 60000 + prepBufferMs;
    availabilityTimeline.push(nextMs);
    availabilityTimeline.sort((a, b) => a - b);
  });

  let nextPartyEstimate: WaitTimeEstimation['nextPartyEstimate'];
  if (typeof options.partySize === 'number') {
    const size = Number.isFinite(options.partySize)
      ? Math.max(1, Math.floor(options.partySize))
      : 2;

    const nextAvailability = availabilityTimeline.shift();

    if (typeof nextAvailability === 'number') {
      const waitMinutes = Math.max(
        MIN_WAIT_MINUTES,
        Math.ceil((nextAvailability - nowMs) / 60000),
      );
      nextPartyEstimate = {
        partySize: size,
        estimatedWaitMinutes: waitMinutes,
        estimatedSeatTime: new Date(nextAvailability).toISOString(),
      };

      const avgDwell = getAverageDwell(size);
      const nextMs = nextAvailability + avgDwell * 60000 + prepBufferMs;
      availabilityTimeline.push(nextMs);
      availabilityTimeline.sort((a, b) => a - b);
    } else {
      // Use wait time seed for new days, otherwise use dwell average
      const fallbackWait = waitlist.length === 0 
        ? 0 
        : (waitTimeSeed > 0 ? waitTimeSeed : safeOverallAvg);
      nextPartyEstimate = {
        partySize: size,
        estimatedWaitMinutes: Math.round(fallbackWait),
        estimatedSeatTime: new Date(nowMs + fallbackWait * 60000).toISOString(),
      };
    }
  }

  return {
    generatedAt: now.toISOString(),
    restaurantId,
    queueLength: waitlist.length,
    availableTableCount: availableTables.length,
    occupiedTableCount: seatedReservations.length,
    averageDwellMinutes: safeOverallAvg,
    queueEstimates,
    nextPartyEstimate,
  };
}


