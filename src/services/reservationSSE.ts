// Real-time reservation updates using Server-Sent Events (SSE)
import { ActiveReservation, updateActiveReservation, clearActiveReservation } from './reservationStorage';
import { updateReservationInHistory } from './reservationHistory';
import { showInAppNotification } from '../components/InAppNotificationSystem';
import { notificationService } from './notificationService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

let eventSource: EventSource | null = null;
let activeReservation: ActiveReservation | null = null;
let lastKnownStatus: string | null = null;
let lastKnownPosition: number | undefined = undefined;
let lastKnownLeftAt: string | null = null;

/**
 * Start SSE connection for real-time reservation updates
 */
export function startReservationSSE(reservation: ActiveReservation): void {
  // Close existing connection if any
  stopReservationSSE();

  activeReservation = reservation;
  lastKnownStatus = reservation.status;
  lastKnownPosition = reservation.queuePosition;
  lastKnownLeftAt = null;

  const url = `${API_URL}/sse/reservations/${reservation.reservationId}`;
  console.log(`[SSE] Connecting to ${url}`);

  eventSource = new EventSource(url);

  eventSource.onopen = () => {
    console.log('[SSE] Connection established');
  };

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('[SSE] Received message:', data);

      if (data.type === 'connected') {
        console.log('[SSE] Initial connection confirmed');
        return;
      }

      if (data.type === 'reservation_updated' && data.reservation) {
        handleReservationUpdate(data.reservation);
      }
    } catch (error) {
      console.error('[SSE] Error parsing message:', error);
    }
  };

  eventSource.onerror = (error) => {
    console.error('[SSE] Connection error:', error);
    // EventSource will automatically attempt to reconnect
  };
}

/**
 * Stop SSE connection
 */
export function stopReservationSSE(): void {
  if (eventSource) {
    console.log('[SSE] Closing connection');
    eventSource.close();
    eventSource = null;
  }
  activeReservation = null;
  lastKnownStatus = null;
  lastKnownPosition = undefined;
  lastKnownLeftAt = null;
}

/**
 * Handle incoming reservation updates from SSE
 */
function handleReservationUpdate(serverReservation: any): void {
  if (!activeReservation) return;

  console.log('[SSE] Processing reservation update:', serverReservation);

  // Update local storage
  const updates: Partial<ActiveReservation> = {
    status: serverReservation.status,
    queuePosition: serverReservation.queuePosition,
    holdUntil: serverReservation.holdUntil,
    holdStatus: serverReservation.holdStatus,
  };

  updateActiveReservation(updates);
  updateReservationInHistory(activeReservation.reservationId, {
    status: serverReservation.status,
    queuePosition: serverReservation.queuePosition,
    holdUntil: serverReservation.holdUntil,
    holdStatus: serverReservation.holdStatus,
    leftAt: serverReservation.leftAt,
    seatedAt: serverReservation.seatedAt,
  });

  // Detect changes and trigger notifications
  checkForChanges(serverReservation);

  // Update tracking variables
  lastKnownStatus = serverReservation.status;
  lastKnownPosition = serverReservation.queuePosition;
  lastKnownLeftAt = serverReservation.leftAt;

  // Handle terminal states
  console.log('[SSE] Checking terminal states:', {
    status: serverReservation.status,
    leftAt: serverReservation.leftAt,
    hasLeftAt: !!serverReservation.leftAt
  });

  if (serverReservation.status === 'seated' && serverReservation.leftAt) {
    // Customer checked out - show review notification
    console.log('[SSE] Customer checked out - showing review notification');
    showInAppNotification({
      type: 'success',
      title: '🙏 Thank You for Visiting!',
      message: `We hope you enjoyed ${activeReservation.restaurantName}! Please take a moment to rate your experience.`,
      persistent: true,
      actionLabel: 'Leave a Review',
      onAction: () => {
        // Navigate to restaurant profile with rating form open
        window.location.hash = `#restaurant-profile?id=${activeReservation.restaurantId}&qr=true`;
      }
    });
    
    // Wait 0.5 seconds before moving to past
    setTimeout(() => {
      console.log('[SSE] Moving reservation to past after checkout');
      clearActiveReservation();
      stopReservationSSE();
    }, 500);
  } else if (['cancelled', 'no_show'].includes(serverReservation.status)) {
    // Handle cancellation notifications
    console.log('[SSE] Handling cancellation notification');
    handleCancellationNotification(serverReservation);
    
    // Wait 0.5 seconds before clearing
    setTimeout(() => {
      clearActiveReservation();
      stopReservationSSE();
    }, 500);
  }
}

/**
 * Check for changes and send appropriate notifications
 */
function checkForChanges(serverReservation: any): void {
  if (!activeReservation) return;

  // Check if leftAt was just set (checkout event)
  if (serverReservation.leftAt && !lastKnownLeftAt && serverReservation.status === 'seated') {
    console.log('[SSE] leftAt was just set - customer checked out!');
    
    // Show notification first
    showInAppNotification({
      type: 'success',
      title: '🙏 Thank You for Visiting!',
      message: `We hope you enjoyed ${activeReservation.restaurantName}! Please take a moment to rate your experience.`,
      persistent: true,
      actionLabel: 'Leave a Review',
      onAction: () => {
        window.location.hash = `#restaurant-profile?id=${activeReservation.restaurantId}&qr=true`;
      }
    });
    
    // Wait 0.5 seconds before moving to past and stopping SSE
    setTimeout(() => {
      console.log('[SSE] Moving reservation to past after checkout');
      clearActiveReservation();
      stopReservationSSE();
    }, 500);
    
    return; // Don't process other changes after checkout
  }

  if (!lastKnownStatus) return;

  // Status change
  if (serverReservation.status !== lastKnownStatus) {
    handleStatusChange(serverReservation);
  }

  // Queue position change
  if (
    typeof serverReservation.queuePosition === 'number' &&
    typeof lastKnownPosition === 'number' &&
    serverReservation.queuePosition !== lastKnownPosition
  ) {
    handleQueuePositionChange(lastKnownPosition, serverReservation.queuePosition);
  }

  // Hold expiry warning (5 minutes remaining)
  if (serverReservation.holdUntil && serverReservation.holdStatus === 'active') {
    const holdTime = new Date(serverReservation.holdUntil).getTime();
    const now = Date.now();
    const minutesRemaining = Math.floor((holdTime - now) / 60000);

    if (minutesRemaining === 5 && lastKnownStatus === 'confirmed') {
      showInAppNotification({
        type: 'warning',
        title: '⏰ 5 Minutes Remaining',
        message: `Your table hold at ${activeReservation.restaurantName} expires in 5 minutes. Please arrive soon!`,
        persistent: true,
      });
    }
  }
}

/**
 * Handle status change notifications
 */
function handleStatusChange(serverReservation: any): void {
  if (!activeReservation) return;

  switch (serverReservation.status) {
    case 'confirmed':
      console.log('[SSE] Sending table ready notification');
      showInAppNotification({
        type: 'success',
        title: '🎉 Table Ready!',
        message: `Your table at ${activeReservation.restaurantName} is ready! You have 15 minutes to arrive.`,
        persistent: true,
      });
      // Also show browser notification
      notificationService.notifyReservation(
        'ready',
        activeReservation.restaurantName,
        'Your table is ready! You have 15 minutes to arrive.'
      );
      break;

    case 'seated':
      // Check if this is a checkout (seated with leftAt)
      if (serverReservation.leftAt) {
        console.log('[SSE] Status changed to seated with leftAt - this is a checkout');
        showInAppNotification({
          type: 'success',
          title: '🙏 Thank You for Visiting!',
          message: `We hope you enjoyed ${activeReservation.restaurantName}! Please take a moment to rate your experience.`,
          persistent: true,
          actionLabel: 'Leave a Review',
          onAction: () => {
            window.location.hash = `#restaurant-profile?id=${activeReservation.restaurantId}&qr=true`;
          }
        });
        
        // Wait 0.5 seconds before moving to past
        setTimeout(() => {
          console.log('[SSE] Moving reservation to past after checkout');
          clearActiveReservation();
          stopReservationSSE();
        }, 500);
      } else {
        // Just seated, not checked out yet
        showInAppNotification({
          type: 'success',
          title: '✅ Seated - Enjoy Your Meal!',
          message: `You've been seated at ${activeReservation.restaurantName}. Have a wonderful dining experience!`,
          persistent: false,
        });
      }
      break;

    case 'cancelled':
      handleCancellationNotification(serverReservation);
      break;

    case 'no_show':
      showInAppNotification({
        type: 'warning',
        title: 'Marked as No-Show',
        message: `Your reservation at ${activeReservation.restaurantName} was marked as no-show.`,
        persistent: true,
      });
      break;
  }
}

/**
 * Handle cancellation notifications based on reason
 */
function handleCancellationNotification(serverReservation: any): void {
  if (!activeReservation) return;

  const reason = serverReservation.cancellationReason;
  let cancelMessage = `Your reservation at ${activeReservation.restaurantName} has been cancelled.`;
  let cancelTitle = 'Reservation Cancelled';

  if (reason === 'staff_removed') {
    cancelTitle = 'Removed from Queue';
    cancelMessage = `The restaurant had to release your spot at ${activeReservation.restaurantName}. If you're still planning to visit, please join the queue again.`;
  } else if (reason === 'hold_expired') {
    cancelTitle = 'Hold Expired';
    cancelMessage = `Your 15-minute hold at ${activeReservation.restaurantName} has expired. Please join the queue again if you'd like to dine with us.`;
  } else if (reason === 'daily_reset') {
    cancelTitle = 'Queue Reset';
    cancelMessage = `The daily queue at ${activeReservation.restaurantName} has been reset. You can join again for today's service.`;
  }

  showInAppNotification({
    type: 'info',
    title: cancelTitle,
    message: cancelMessage,
    persistent: true,
  });
}

/**
 * Handle queue position change notifications
 */
function handleQueuePositionChange(oldPosition: number, newPosition: number): void {
  if (!activeReservation) return;

  if (newPosition < oldPosition) {
    showInAppNotification({
      type: 'success',
      title: '📍 Position Updated',
      message: `You moved up! You're now #${newPosition} in line at ${activeReservation.restaurantName}.`,
      persistent: false,
    });
    // Browser notification for position change
    notificationService.notifyQueue(activeReservation.restaurantName, newPosition);
  }
}

/**
 * Check if SSE is connected
 */
export function isSSEConnected(): boolean {
  return eventSource !== null && eventSource.readyState === EventSource.OPEN;
}

