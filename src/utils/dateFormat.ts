/**
 * Format date/time in UAE/GST timezone (Asia/Dubai, UTC+4)
 * All dates should be displayed in UAE timezone for consistency with backend
 */

const GST_TIMEZONE = 'Asia/Dubai'; // GST = UTC+4

/**
 * Format a date as time string in GST timezone
 * @param date Date object or ISO string
 * @param options Intl.DateTimeFormatOptions
 * @returns Formatted time string
 */
export function formatGSTTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    timeZone: GST_TIMEZONE,
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}

/**
 * Format a date as date string in GST timezone
 * @param date Date object or ISO string
 * @param options Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatGSTDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    timeZone: GST_TIMEZONE,
    ...options,
  });
}

/**
 * Format a date as date and time string in GST timezone
 * @param date Date object or ISO string
 * @param options Intl.DateTimeFormatOptions
 * @returns Formatted date and time string
 */
export function formatGSTDateTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    timeZone: GST_TIMEZONE,
    hour12: true,
    ...options,
  });
}

/**
 * Format date and time in GST timezone (human-friendly format)
 * @param date Date object or ISO string
 * @returns Formatted string like "Jan 15, 2024, 7:30 PM"
 */
export function formatGSTDateTimeLong(date: Date | string): string {
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
 * Format date in GST timezone as short date string (e.g., "Jan 15")
 * @param date Date object or ISO string
 * @returns Formatted string like "Jan 15"
 */
export function formatGSTDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    timeZone: GST_TIMEZONE,
    month: 'short',
    day: 'numeric',
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
 * Format date as YYYY-MM-DD string in GST timezone
 * @param date Date object or ISO string
 * @returns String in format YYYY-MM-DD
 */
export function formatGSTDateString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const gstDateStr = d.toLocaleString('en-US', {
    timeZone: GST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [month, day, year] = gstDateStr.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

