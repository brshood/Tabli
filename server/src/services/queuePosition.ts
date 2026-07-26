// Single source of truth for "who is waiting in line, and in what order".
//
// Queue positions used to be a snapshot written when a customer joined and then
// hand-patched with $inc, using filters that differed between call sites. Two
// things went wrong: entries from previous days were still counted as people
// ahead (a fresh customer could be told they were #30 with an empty queue), and
// the number never matched the live line once guests were seated or removed.
//
// Everything here derives positions from the live queue instead, so a customer's
// number is always their index among the people actually still waiting.

import { Reservation } from '../models/Reservation';

export const ACTIVE_QUEUE_STATUSES = ['pending', 'confirmed'] as const;

export type SeatingPref = 'indoor' | 'outdoor' | 'no-preference';

const GST_OFFSET_MS = 4 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** The queue is cleared at 1 AM GST, so that is where one service day ends and the next begins */
const SERVICE_DAY_RESET_HOUR_GST = 1;

/**
 * Start of the service day currently in progress (most recent 1 AM GST).
 * Anything requested before this belongs to a finished service and must never
 * count towards a waiting customer's position.
 */
export function getServiceDayStart(now: Date = new Date()): Date {
  const gst = new Date(now.getTime() + GST_OFFSET_MS);
  const resetGstMs = Date.UTC(
    gst.getUTCFullYear(),
    gst.getUTCMonth(),
    gst.getUTCDate(),
    SERVICE_DAY_RESET_HOUR_GST
  );
  let startMs = resetGstMs - GST_OFFSET_MS;
  // Between midnight and 1 AM GST we are still serving the previous day's queue
  if (startMs > now.getTime()) startMs -= DAY_MS;
  return new Date(startMs);
}

/**
 * Matches entries that are still waiting to be called for a table.
 *
 * Covers both ways a queue entry is created: POST /queue/:id/join (mode
 * 'waitlist') and POST /reservations when the section is full (mode 'reserve'
 * with reservationType 'waitlist'). Guests who have already been called are
 * excluded — they have left the waiting line and appear on the staff "Called"
 * board, so counting them would make positions disagree with the dashboard.
 */
export function buildActiveQueueFilter(restaurantId: string | any, now: Date = new Date()) {
  return {
    restaurantId,
    status: { $in: ACTIVE_QUEUE_STATUSES as unknown as string[] },
    requestedAt: { $gte: getServiceDayStart(now) },
    $and: [
      {
        $or: [
          { mode: 'waitlist' },
          { mode: 'reserve', reservationType: 'waitlist' },
        ],
      },
      {
        $or: [{ calledAt: { $exists: false } }, { calledAt: null }],
      },
    ],
  };
}

interface QueueEntry {
  _id: any;
  seatingPreference?: SeatingPref | null;
}

/**
 * Fetch the live waiting line in first-come-first-served order.
 * `_id` breaks ties so two entries with identical timestamps keep a stable order.
 */
export async function getActiveQueue(restaurantId: string | any, now: Date = new Date()) {
  return Reservation.find(buildActiveQueueFilter(restaurantId, now))
    .sort({ requestedAt: 1, _id: 1 })
    .select({ _id: 1, seatingPreference: 1, requestedAt: 1, queuePosition: 1 })
    .lean();
}

/**
 * Map each waiting entry to its 1-based index in the line.
 *
 * A guest only queues behind guests who compete for the same section, so an
 * indoor request is not held up by outdoor-only waiters. Guests with no
 * preference take whichever section frees up first, so they get the better of
 * the two indexes.
 */
export function positionsForQueue(entries: QueueEntry[]): Map<string, number> {
  const wantsIndoor = (pref?: SeatingPref | null) => !pref || pref === 'indoor' || pref === 'no-preference';
  const wantsOutdoor = (pref?: SeatingPref | null) => !pref || pref === 'outdoor' || pref === 'no-preference';

  const indoorIndex = new Map<string, number>();
  const outdoorIndex = new Map<string, number>();

  entries.forEach((entry) => {
    const id = String(entry._id);
    if (wantsIndoor(entry.seatingPreference)) indoorIndex.set(id, indoorIndex.size);
    if (wantsOutdoor(entry.seatingPreference)) outdoorIndex.set(id, outdoorIndex.size);
  });

  const positions = new Map<string, number>();
  entries.forEach((entry) => {
    const id = String(entry._id);
    const pref = entry.seatingPreference || 'no-preference';
    if (pref === 'indoor') {
      positions.set(id, (indoorIndex.get(id) ?? 0) + 1);
    } else if (pref === 'outdoor') {
      positions.set(id, (outdoorIndex.get(id) ?? 0) + 1);
    } else {
      const best = Math.min(indoorIndex.get(id) ?? 0, outdoorIndex.get(id) ?? 0);
      positions.set(id, best + 1);
    }
  });

  return positions;
}

/** The live position of one reservation, or null when it is no longer waiting */
export async function computeQueuePosition(
  restaurantId: string | any,
  reservationId: any,
  now: Date = new Date()
): Promise<number | null> {
  const entries = await getActiveQueue(restaurantId, now);
  return positionsForQueue(entries as QueueEntry[]).get(String(reservationId)) ?? null;
}

export interface QueuePositionChange {
  reservationId: string;
  queuePosition: number;
}

/**
 * Renumber the whole waiting line and persist it, returning only the entries
 * whose number actually moved so callers can push those updates to customers.
 *
 * Call this after anything that changes the line (join, seat, call, cancel,
 * remove) instead of decrementing positions by hand.
 */
export async function recomputeQueuePositions(
  restaurantId: string | any,
  now: Date = new Date()
): Promise<QueuePositionChange[]> {
  const entries = await getActiveQueue(restaurantId, now);
  const positions = positionsForQueue(entries as QueueEntry[]);

  const changes: QueuePositionChange[] = [];
  const writes: any[] = [];

  entries.forEach((entry: any) => {
    const id = String(entry._id);
    const position = positions.get(id);
    if (typeof position !== 'number' || entry.queuePosition === position) return;
    changes.push({ reservationId: id, queuePosition: position });
    writes.push({
      updateOne: {
        filter: { _id: entry._id },
        update: { $set: { queuePosition: position } },
      },
    });
  });

  if (writes.length > 0) {
    await Reservation.bulkWrite(writes);
  }

  return changes;
}
