/**
 * Date formatting utilities for UAE/GST timezone (UTC+4)
 * GST (Gulf Standard Time) does not observe daylight saving time
 */
/**
 * Convert a Date to GST timezone
 * GST is UTC+4 (no daylight saving)
 */
export function toGSTDate(date) {
    // Get UTC time
    const utcTime = date.getTime();
    // GST is UTC+4 (4 hours ahead)
    const gstOffset = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
    return new Date(utcTime + gstOffset);
}
/**
 * Format date and time in GST timezone
 * Example: "Nov 27, 2025 at 3:30 PM"
 */
export function formatGSTDateTime(date) {
    return date.toLocaleString('en-AE', {
        timeZone: 'Asia/Dubai',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}
/**
 * Format time only in GST timezone
 * Example: "3:30 PM"
 */
export function formatGSTTime(date) {
    return date.toLocaleTimeString('en-AE', {
        timeZone: 'Asia/Dubai',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}
/**
 * Format date only in GST timezone
 * Example: "Nov 27, 2025"
 */
export function formatGSTDate(date) {
    return date.toLocaleDateString('en-AE', {
        timeZone: 'Asia/Dubai',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
/**
 * Get current time in GST timezone
 */
export function getCurrentGSTTime() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
}
