/**
 * Format date/time in UAE/GST timezone (Asia/Dubai, UTC+4)
 * All dates should be displayed in UAE timezone for consistency
 */

/**
 * Format a date as time string in UAE timezone
 * @param date Date object (will be converted to UAE time)
 * @param options Intl.DateTimeFormatOptions
 * @returns Formatted time string
 */
export function formatUaeTime(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Dubai',
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
    timeZone: 'Asia/Dubai',
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
    timeZone: 'Asia/Dubai',
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

