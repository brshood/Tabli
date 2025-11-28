/**
 * Format date/time in UAE/GST timezone (Asia/Dubai, UTC+4)
 * All dates should be displayed in UAE timezone for consistency
 */

const GST_TIMEZONE = 'Asia/Dubai'; // GST = UTC+4

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
  const now = new Date();
  // Get current time in GST timezone as string
  const gstDateStr = now.toLocaleString('en-US', { timeZone: GST_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
  // Parse back to create a date at midnight GST
  const [month, day, year] = gstDateStr.split('/');
  // Create a date string in ISO format that represents midnight in GST
  const gstMidnight = new Date(`${year}-${month}-${day}T00:00:00+04:00`);
  return gstMidnight;
}

