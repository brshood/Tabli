// Service to track multiple reservations (not just active one)
// Allows users to see all their current and past reservations

export interface ReservationHistoryItem {
  reservationId: string;
  restaurantId: string;
  restaurantName: string;
  mode: 'reserve' | 'waitlist';
  queuePosition?: number;
  status: 'pending' | 'confirmed' | 'seated' | 'cancelled' | 'no_show';
  contactMethod: 'phone' | 'email';
  email?: string;
  phone?: string;
  partySize: number;
  name?: string;
  timestamp: number;
  holdUntil?: string;
  holdStatus?: 'active' | 'expired' | 'confirmed';
  bookedAt: number;
  leftAt?: string; // When customer checked out or left
  seatedAt?: string; // When customer was seated
}

const STORAGE_KEY = 'tabli_reservation_history';
const MAX_HISTORY = 50; // Keep last 50 reservations
const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Add a reservation to history
 */
export function addReservationToHistory(reservation: ReservationHistoryItem): void {
  try {
    const history = getReservationHistory();
    
    // Check if already exists (by reservationId)
    const existingIndex = history.findIndex(r => r.reservationId === reservation.reservationId);
    
    if (existingIndex >= 0) {
      // Update existing
      history[existingIndex] = reservation;
    } else {
      // Add new at beginning
      history.unshift(reservation);
    }
    
    // Keep only MAX_HISTORY most recent
    const trimmed = history.slice(0, MAX_HISTORY);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to add reservation to history:', error);
  }
}

/**
 * Get all reservations from history
 */
export function getReservationHistory(): ReservationHistoryItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const history = JSON.parse(data) as ReservationHistoryItem[];
    
    // Filter out old reservations
    const now = Date.now();
    const filtered = history.filter(r => {
      const age = now - r.bookedAt;
      return age < MAX_AGE;
    });
    
    // If we filtered any, update storage
    if (filtered.length !== history.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
    
    return filtered;
  } catch (error) {
    console.error('Failed to load reservation history:', error);
    return [];
  }
}

/**
 * Update a reservation in history
 */
export function updateReservationInHistory(reservationId: string, updates: Partial<ReservationHistoryItem>): void {
  try {
    const history = getReservationHistory();
    const index = history.findIndex(r => r.reservationId === reservationId);
    
    if (index >= 0) {
      history[index] = { ...history[index], ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    }
  } catch (error) {
    console.error('Failed to update reservation in history:', error);
  }
}

/**
 * Remove a reservation from history
 */
export function removeReservationFromHistory(reservationId: string): void {
  try {
    const history = getReservationHistory();
    const filtered = history.filter(r => r.reservationId !== reservationId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove reservation from history:', error);
  }
}

/**
 * Get active reservations (pending or confirmed)
 */
export function getActiveReservations(): ReservationHistoryItem[] {
  const history = getReservationHistory();
  return history.filter(r => r.status === 'pending' || r.status === 'confirmed');
}

/**
 * Get past reservations (seated, cancelled, no_show)
 */
export function getPastReservations(): ReservationHistoryItem[] {
  const history = getReservationHistory();
  return history.filter(r => r.status === 'seated' || r.status === 'cancelled' || r.status === 'no_show');
}

/**
 * Clear all history
 */
export function clearReservationHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear reservation history:', error);
  }
}

