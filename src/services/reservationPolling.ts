// #13 - Reservation Polling Service
// Polls reservation status and triggers in-app notifications

import { ActiveReservation, getActiveReservation, updateActiveReservation, clearActiveReservation } from './reservationStorage';
import { updateReservationInHistory } from './reservationHistory';
import { showInAppNotification } from '../components/InAppNotificationSystem';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const POLL_INTERVAL = 30000; // 30 seconds

let pollingInterval: number | null = null;
let lastKnownStatus: string | null = null;
let lastKnownPosition: number | null = null;

/**
 * Start polling for reservation updates
 */
export function startReservationPolling(): void {
  if (pollingInterval) {
    console.log('[POLLING] Already running');
    return;
  }

  console.log('[POLLING] Starting reservation status polling');
  
  // Initial poll
  pollReservationStatus();
  
  // Set up interval
  pollingInterval = window.setInterval(pollReservationStatus, POLL_INTERVAL);
}

/**
 * Stop polling for reservation updates
 */
export function stopReservationPolling(): void {
  if (pollingInterval) {
    console.log('[POLLING] Stopping reservation status polling');
    clearInterval(pollingInterval);
    pollingInterval = null;
    lastKnownStatus = null;
    lastKnownPosition = null;
  }
}

/**
 * Poll reservation status once
 */
async function pollReservationStatus(): Promise<void> {
  try {
    const activeReservation = getActiveReservation();
    
    if (!activeReservation) {
      // No active reservation, stop polling
      stopReservationPolling();
      return;
    }

    // Fetch latest status from API
    const response = await fetch(`${API_URL}/reservations/${activeReservation.reservationId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        // Reservation not found - could be deleted or you're checking wrong one
        // Just stop polling silently, don't show error (user might have multiple reservations)
        console.log('[POLLING] Reservation not found (404), stopping polling for this one');
        clearActiveReservation();
        stopReservationPolling();
      }
      return;
    }

    const data = await response.json();
    const reservation = data.reservation;

    // Check for status changes
    if (lastKnownStatus === null) {
      // First poll, just record current state
      lastKnownStatus = reservation.status;
      lastKnownPosition = reservation.queuePosition;
    } else {
      checkForChanges(activeReservation, reservation);
    }

    // Update localStorage with latest data
    updateActiveReservation({
      status: reservation.status,
      queuePosition: reservation.queuePosition,
      holdUntil: reservation.holdUntil,
      holdStatus: reservation.holdStatus,
    });
    
    // Also update in history
    updateReservationInHistory(activeReservation.reservationId, {
      status: reservation.status,
      queuePosition: reservation.queuePosition,
      holdUntil: reservation.holdUntil,
      holdStatus: reservation.holdStatus,
      leftAt: reservation.leftAt,
      seatedAt: reservation.seatedAt,
    });

    // Update tracking variables
    lastKnownStatus = reservation.status;
    lastKnownPosition = reservation.queuePosition;

    // Check if customer checked out (seated + leftAt set)
    if (reservation.status === 'seated' && reservation.leftAt && !lastKnownStatus) {
      // This is initial load of a completed reservation
      showInAppNotification({
        type: 'success',
        title: '🙏 Thank You!',
        message: `Thank you for dining at ${activeReservation.restaurantName}! Please rate your experience.`,
        persistent: true,
      });
    }
    
    // If reservation is complete, stop polling
    if (reservation.status === 'seated' || reservation.status === 'cancelled' || reservation.status === 'no_show') {
      // If has leftAt, they checked out
      if (reservation.leftAt && reservation.status === 'seated') {
        showInAppNotification({
          type: 'success',
          title: '🙏 Thank You for Visiting!',
          message: `We hope you enjoyed ${activeReservation.restaurantName}! Share your experience by rating us.`,
          persistent: true,
        });
      }
      clearActiveReservation();
      stopReservationPolling();
    }
  } catch (error) {
    console.error('[POLLING] Error polling reservation status:', error);
  }
}

/**
 * Check for changes and send notifications
 */
function checkForChanges(localReservation: ActiveReservation, serverReservation: any): void {
  // Status change
  if (lastKnownStatus !== serverReservation.status) {
    handleStatusChange(localReservation, lastKnownStatus!, serverReservation.status, serverReservation);
  }

  // Queue position change (improved)
  if (
    localReservation.mode === 'waitlist' &&
    serverReservation.status === 'pending' &&
    lastKnownPosition !== null &&
    serverReservation.queuePosition !== null &&
    lastKnownPosition !== serverReservation.queuePosition
  ) {
    handleQueuePositionChange(localReservation, lastKnownPosition, serverReservation.queuePosition);
  }

  // Hold expiry warning (5 minutes left)
  if (serverReservation.holdUntil && serverReservation.holdStatus === 'active') {
    const now = Date.now();
    const expiry = new Date(serverReservation.holdUntil).getTime();
    const timeLeft = expiry - now;
    const fiveMinutes = 5 * 60 * 1000;

    if (timeLeft > 0 && timeLeft < fiveMinutes) {
      // Only show once per hold
      const warningShown = sessionStorage.getItem(`hold_warning_${localReservation.reservationId}`);
      if (!warningShown) {
        showInAppNotification({
          type: 'warning',
          title: '⏰ 5 Minutes Left!',
          message: `Your table hold at ${localReservation.restaurantName} expires in 5 minutes. Please arrive soon!`,
          persistent: true,
        });
        sessionStorage.setItem(`hold_warning_${localReservation.reservationId}`, 'true');
      }
    }
  }
}

/**
 * Handle status change notifications
 */
function handleStatusChange(reservation: ActiveReservation, oldStatus: string, newStatus: string, serverReservation?: any): void {
  console.log(`[POLLING] Status change detected: ${oldStatus} → ${newStatus}`);
  
  switch (newStatus) {
    case 'confirmed':
      console.log('[POLLING] Sending table ready notification');
      showInAppNotification({
        type: 'success',
        title: '🎉 Table Ready!',
        message: `Your table at ${reservation.restaurantName} is ready! You have 15 minutes to arrive.`,
        persistent: true,
      });
      break;

    case 'seated':
      showInAppNotification({
        type: 'success',
        title: '✅ Seated - Enjoy Your Meal!',
        message: `You've been seated at ${reservation.restaurantName}. Have a wonderful dining experience!`,
        persistent: false,
      });
      break;

    case 'cancelled':
      // Check cancellation reason for specific message
      const reason = (serverReservation as any).cancellationReason;
      let cancelMessage = `Your reservation at ${reservation.restaurantName} has been cancelled.`;
      let cancelTitle = 'Reservation Cancelled';
      
      if (reason === 'staff_removed') {
        cancelTitle = 'Removed from Queue';
        cancelMessage = `The restaurant had to release your spot at ${reservation.restaurantName}. If you're still planning to visit, please join the queue again.`;
      } else if (reason === 'hold_expired') {
        cancelTitle = 'Hold Expired';
        cancelMessage = `Your 15-minute hold at ${reservation.restaurantName} has expired. Please join the queue again if you'd like to dine with us.`;
      } else if (reason === 'daily_reset') {
        cancelTitle = 'Queue Reset';
        cancelMessage = `The daily queue at ${reservation.restaurantName} has been reset. You can join again for today's service.`;
      }
      
      showInAppNotification({
        type: 'info',
        title: cancelTitle,
        message: cancelMessage,
        persistent: true,
      });
      break;

    case 'no_show':
      showInAppNotification({
        type: 'warning',
        title: 'Marked as No-Show',
        message: `Your reservation at ${reservation.restaurantName} was marked as no-show.`,
        persistent: true,
      });
      break;
  }
}

/**
 * Handle queue position change notifications
 */
function handleQueuePositionChange(reservation: ActiveReservation, oldPosition: number, newPosition: number): void {
  if (newPosition < oldPosition) {
    // Position improved
    const positionsGained = oldPosition - newPosition;
    showInAppNotification({
      type: 'info',
      title: '📍 Queue Update',
      message: `You moved up ${positionsGained} ${positionsGained === 1 ? 'spot' : 'spots'}! Now at position #${newPosition} at ${reservation.restaurantName}.`,
      persistent: false,
    });
  }
}

/**
 * Force a single poll (useful for manual refresh)
 */
export async function forceRefreshReservation(): Promise<void> {
  await pollReservationStatus();
}

