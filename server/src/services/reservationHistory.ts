// Filter building for the staff "History" view: every past waitlist entry and
// table reservation for a restaurant, including ones that were seated, cancelled,
// expired by the stale-queue sweep or marked no-show.

import mongoose from 'mongoose';

export const HISTORY_STATUSES = ['pending', 'confirmed', 'seated', 'cancelled', 'no_show'] as const;
export const HISTORY_DEFAULT_DAYS = 30;
export const HISTORY_MAX_LIMIT = 100;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface HistoryQuery {
  restaurantId: string;
  from?: string;
  to?: string;
  status?: string;
  q?: string;
}

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Start of the given YYYY-MM-DD day in GST (UTC+4), or null if it isn't one */
export function gstDayStart(date: string | undefined): Date | null {
  if (!date || !DATE_RE.test(date)) return null;
  const d = new Date(`${date}T00:00:00+04:00`);
  return isNaN(d.getTime()) ? null : d;
}

export function buildHistoryFilter(query: HistoryQuery, now: Date = new Date()): Record<string, any> {
  const filter: Record<string, any> = {
    restaurantId: new mongoose.Types.ObjectId(query.restaurantId),
  };

  const from = gstDayStart(query.from);
  const toStart = gstDayStart(query.to);
  // `to` is inclusive: run through the end of that GST day
  const to = toStart ? new Date(toStart.getTime() + DAY_MS - 1) : null;
  const rangeFrom = from ?? new Date(now.getTime() - HISTORY_DEFAULT_DAYS * DAY_MS);
  filter.requestedAt = { $gte: rangeFrom, ...(to ? { $lte: to } : {}) };

  if (query.status && (HISTORY_STATUSES as readonly string[]).includes(query.status)) {
    filter.status = query.status;
  }

  const q = (query.q || '').trim().slice(0, 100);
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { phone: rx }, { email: rx }];
  }

  return filter;
}
