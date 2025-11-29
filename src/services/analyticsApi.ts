import { formatGSTDateString } from '../utils/dateFormat';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface DailySummary {
  _id: string;
  restaurantId: string;
  date: string;
  metrics: {
    totalBookings: number;
    seatedGuests: number;
    noShows: number;
    manuallyAddedCustomers: number;
    avgTurnaroundTime: number;
    busiestTable: {
      tableId: string;
      tableName: string;
      reservations: number;
      totalTimeOccupied: number;
      totalGuests: number;
    };
    leastBusiestTable: {
      tableId: string;
      tableName: string;
      reservations: number;
      totalTimeOccupied: number;
      totalGuests: number;
    };
    avgGuestsPerTable: number;
    tableStats: Array<{
      tableId: string;
      tableName: string;
      reservations: number;
      totalTimeOccupied: number;
      totalGuests: number;
      avgTurnaroundTime: number;
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Generate a daily summary for a specific date
 */
export async function generateDailySummary(
  restaurantId: string,
  date: string
): Promise<{ summary: DailySummary }> {
  const response = await fetch(`${API_URL}/analytics/daily-summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ restaurantId, date }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to generate daily summary' }));
    // Prefer the message field if available, otherwise use error field
    const errorMessage = error.message || error.error || 'Failed to generate daily summary';
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Get a stored daily summary for a specific date
 */
export async function getDailySummary(
  restaurantId: string,
  date: string
): Promise<{ summary: DailySummary }> {
  const response = await fetch(`${API_URL}/analytics/daily-summary/${date}?restaurantId=${restaurantId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to get daily summary' }));
    throw new Error(error.error || 'Failed to get daily summary');
  }

  return response.json();
}

/**
 * Get PDF URL for daily summary
 * Opens PDF in new tab
 */
export function getDailySummaryPdfUrl(restaurantId: string, date: string): string {
  // Format date as YYYY-MM-DD in GST timezone
  const dateStr = formatGSTDateString(date);
  return `${API_URL}/analytics/daily-summary/pdf/${dateStr}?restaurantId=${restaurantId}`;
}

/**
 * Open daily summary PDF in a new tab
 */
export function openDailySummaryPdf(restaurantId: string, date: string): void {
  const url = getDailySummaryPdfUrl(restaurantId, date);
  window.open(url, '_blank');
}

