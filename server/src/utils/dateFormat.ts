/**
 * Format date/time in UAE/GST timezone (Asia/Dubai, UTC+4)
 * All dates should be displayed in UAE timezone for consistency
 */

export const GST_TIMEZONE = 'Asia/Dubai'; // GST = UTC+4

/**
 * Format a date as time string in UAE timezone
 * @param date Date object (will be converted to UAE time)
 * @param options Intl.DateTimeFormatOptions
 * @returns Formatted time string
 */
export function formatUaeTime(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleTimeString('en-US', {
    timeZone: GST_TIMEZONE,
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}

/**
 * Format a date as date string in UAE timezone
 * @param date Date object (will be converted to UAE time)
 * @param options Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatUaeDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString('en-US', {
    timeZone: GST_TIMEZONE,
    ...options,
  });
}

/**
 * Format a date as date and time string in UAE timezone
 * @param date Date object (will be converted to UAE time)
 * @param options Intl.DateTimeFormatOptions
 * @returns Formatted date and time string
 */
export function formatUaeDateTime(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleString('en-US', {
    timeZone: GST_TIMEZONE,
    hour12: true,
    ...options,
  });
}

/**
 * Get current date/time in UAE timezone
 * @returns Date object (Note: Date objects are always in local time, but we format in UAE timezone)
 */
export function getUaeNow(): Date {
  // Date objects are always in UTC internally, we just format them in UAE timezone
  return new Date();
}

/**
 * Create a date object and interpret it as UAE time
 * Note: This doesn't change the Date object itself (Date is always UTC internally),
 * but provides a way to format it correctly as UAE time
 * @param dateString ISO string or Date
 * @returns Date object
 */
export function parseAsUaeTime(dateString: string | Date): Date {
  if (dateString instanceof Date) {
    return dateString;
  }
  return new Date(dateString);
}

/**
 * Convert a date to GST timezone (returns a new Date representing the same moment in GST)
 * Note: Date objects are always UTC internally, but this formats and re-interprets in GST context
 * @param date Date object or string
 * @returns Date object (same moment, formatted for GST)
 */
export function toGST(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d; // Date objects are already timezone-agnostic, we just format in GST
}

/**
 * Format date and time in GST timezone (human-friendly format)
 * @param date Date object or string
 * @returns Formatted string like "Jan 15, 2024, 7:30 PM"
 */
export function formatGSTDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    timeZone: GST_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get current date/time in GST timezone
 * @returns Date object
 */
export function nowGST(): Date {
  return new Date();
}

/**
 * Get the start of today in GST timezone (midnight GST)
 * @returns Date object representing midnight GST today
 */
export function getTodayStartGST(): Date {
  const { year, month, day } = getGSTDateComponents(new Date());
  return new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+04:00`);
}

/**
 * Get the hour in GST timezone from a Date object
 * @param date Date object
 * @returns Hour (0-23) in GST timezone
 */
export function getGSTHour(date: Date): number {
  return parseInt(date.toLocaleString('en-US', { 
    timeZone: GST_TIMEZONE, 
    hour: '2-digit', 
    hour12: false 
  }), 10);
}

/**
 * Get the date components (year, month, day) in GST timezone
 * @param date Date object
 * @returns Object with year, month (1-12), day
 */
export function getGSTDateComponents(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: GST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value('year'), month: value('month'), day: value('day') };
}

/**
 * Get start of a specific date in GST timezone (midnight GST)
 * @param date Date object (time portion is ignored)
 * @returns Date object representing midnight GST for that date
 */
export function getGSTStartOfDay(date: Date): Date {
  const { year, month, day } = getGSTDateComponents(date);
  return new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+04:00`);
}

/**
 * Get end of a specific date in GST timezone (23:59:59.999 GST)
 * @param date Date object (time portion is ignored)
 * @returns Date object representing end of day GST for that date
 */
export function getGSTEndOfDay(date: Date): Date {
  const { year, month, day } = getGSTDateComponents(date);
  return new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T23:59:59.999+04:00`);
}

/**
 * Get start of yesterday in GST timezone
 * @returns Date object representing midnight GST yesterday
 */
export function getYesterdayStartGST(): Date {
  const now = new Date();
  const { year, month, day } = getGSTDateComponents(now);
  const yesterday = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+04:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
}

/**
 * Get start of N days ago in GST timezone
 * @param daysAgo Number of days to go back
 * @returns Date object representing midnight GST N days ago
 */
export function getDaysAgoStartGST(daysAgo: number): Date {
  const todayStart = getTodayStartGST();
  const result = new Date(todayStart);
  result.setDate(result.getDate() - daysAgo);
  return result;
}

/**
 * Get start of N months ago in GST timezone
 * @param monthsAgo Number of months to go back
 * @returns Date object representing midnight GST N months ago
 */
export function getMonthsAgoStartGST(monthsAgo: number): Date {
  const todayStart = getTodayStartGST();
  const result = new Date(todayStart);
  result.setMonth(result.getMonth() - monthsAgo);
  return result;
}

/**
 * Format date as YYYY-MM-DD string in GST timezone
 * @param date Date object
 * @returns String in format YYYY-MM-DD
 */
export function formatGSTDateString(date: Date): string {
  const { year, month, day } = getGSTDateComponents(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

