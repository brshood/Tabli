// Single definition of "which parties are at a table right now".
//
// Two things make this less obvious than reading Table.status:
//   - Checkout keeps the reservation at status 'seated' and only stamps leftAt,
//     on purpose, so analytics can still measure dwell time. Presence therefore
//     has to be derived from leftAt, not from status alone.
//   - Table.status is not authoritative any more. The staff dashboard has no
//     seating or checkout workflow, so a row can sit at 'occupied' indefinitely
//     after the guests left, and nothing will ever clear it.
//
// Deriving occupancy from reservations instead means stale table rows stop
// skewing wait estimates and the capacity breakdown.

import { getServiceDayStart } from './queuePosition';

export function buildLiveSeatedFilter(restaurantId: string | any, now: Date = new Date()) {
  return {
    restaurantId,
    status: 'seated',
    tableId: { $exists: true, $ne: null },
    // Seatings belong to a service day; the queue uses the same boundary so a
    // party seated before midnight still counts in the small hours after it.
    seatedAt: { $gte: getServiceDayStart(now) },
    $or: [{ leftAt: { $exists: false } }, { leftAt: null }],
  };
}
