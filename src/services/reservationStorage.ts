// #13 - LocalStorage service for active reservation tracking
// Allows users to track their reservation status without email/SMS

export interface ActiveReservation {
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
  timestamp: number; // When reservation was created
  holdUntil?: string; // ISO string for hold expiry
  holdStatus?: 'active' | 'expired' | 'confirmed';
}

const STORAGE_KEY = 'tabli_active_reservation';

/**
 * Save active reservation to localStorage
 * Also triggers a storage event to sync across Safari/PWA contexts
 */
export function saveActiveReservation(reservation: ActiveReservation): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reservation));
    
    // Dispatch a custom storage event to sync across Safari/PWA contexts
    // (native storage events only fire in OTHER windows, not the same window)
    try {
      window.dispatchEvent(new StorageEvent('storage', {
        key: STORAGE_KEY,
        newValue: JSON.stringify(reservation),
        oldValue: localStorage.getItem(STORAGE_KEY),
        storageArea: localStorage,
      }));
      
      // Also dispatch a custom event for our app-specific listeners
      window.dispatchEvent(new CustomEvent('tabli:reservation-updated', {
        detail: { reservation }
      }));
    } catch (eventError) {
      console.warn('[SYNC] Failed to dispatch storage event:', eventError);
    }
  } catch (error) {
    console.error('Failed to save reservation to localStorage:', error);
  }
}

/**
 * Get active reservation from localStorage
 */
export function getActiveReservation(): ActiveReservation | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    
    const reservation = JSON.parse(data) as ActiveReservation;
    
    // Check if reservation is stale (older than 24 hours)
    const now = Date.now();
    const age = now - reservation.timestamp;
    const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
    
    if (age > MAX_AGE) {
      // Reservation is too old, clear it
      clearActiveReservation();
      return null;
    }
    
    // Don't return if already completed/cancelled
    if (reservation.status === 'seated' || reservation.status === 'cancelled' || reservation.status === 'no_show') {
      clearActiveReservation();
      return null;
    }
    
    return reservation;
  } catch (error) {
    console.error('Failed to load reservation from localStorage:', error);
    return null;
  }
}

/**
 * Update active reservation (merge with existing data)
 */
export function updateActiveReservation(updates: Partial<ActiveReservation>): void {
  try {
    const existing = getActiveReservation();
    if (!existing) return;
    
    const updated = { ...existing, ...updates };
    saveActiveReservation(updated);
  } catch (error) {
    console.error('Failed to update reservation in localStorage:', error);
  }
}

/**
 * Clear active reservation from localStorage
 */
export function clearActiveReservation(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear reservation from localStorage:', error);
  }
}

/**
 * Check if user has an active reservation
 */
export function hasActiveReservation(): boolean {
  return getActiveReservation() !== null;
}

