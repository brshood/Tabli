import mongoose from 'mongoose';
import { Reservation } from '../models/Reservation';
import { Table } from '../models/Table';

const DEFAULT_DWELL_MINUTES = 45;
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

  const now = new Date();
  const nowMs = now.getTime();
  const historyWindowStart = new Date(now);
  historyWindowStart.setDate(historyWindowStart.getDate() - HISTORY_WINDOW_DAYS);

  const [waitlist, seatedReservations, tables, dwellAgg] = await Promise.all([
    Reservation.find({
      restaurantId,
      mode: 'waitlist',
      status: { $in: ['pending', 'confirmed'] },
    })
      .sort({ queuePosition: 1, requestedAt: 1 })
      .lean(),
    Reservation.find({
      restaurantId,
      status: 'seated',
      tableId: { $exists: true, $ne: null },
    }).lean(),
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

  const availableTables = tables.filter((table) => table.status === 'available');
  const cleaningTables = tables.filter((table) => table.status === 'cleaning');

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
  if (availabilityTimeline.length === 0 && waitlist.length > 0) {
    availabilityTimeline.push(nowMs + overallAvg * 60000);
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
        queuePosition: reservation.queuePosition ?? index + 1,
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
      queuePosition: reservation.queuePosition ?? index + 1,
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
      const fallbackWait = waitlist.length === 0 ? 0 : safeOverallAvg;
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


