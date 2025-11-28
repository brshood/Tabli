// Real-time staff notifications using Server-Sent Events (SSE)
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

let eventSource: EventSource | null = null;
let restaurantId: string | null = null;
let onQueueUpdate: (() => void) | null = null;

/**
 * Start SSE connection for staff real-time updates
 */
export function startStaffSSE(
  restaurantIdParam: string,
  onQueueUpdateCallback: () => void
): void {
  // Close existing connection if any
  stopStaffSSE();

  restaurantId = restaurantIdParam;
  onQueueUpdate = onQueueUpdateCallback;

  const url = `${API_URL}/sse/staff/${restaurantId}`;
  console.log(`[SSE:STAFF] Connecting to ${url}`);

  eventSource = new EventSource(url);

  eventSource.onopen = () => {
    console.log('[SSE:STAFF] Connection established');
  };

  eventSource.onmessage = (event) => {
    try {
      // Skip heartbeat messages (they start with `:heartbeat`)
      if (event.data.startsWith(':')) {
        return;
      }

      const data = JSON.parse(event.data);
      console.log('[SSE:STAFF] Received message:', data);

      if (data.type === 'connected') {
        console.log('[SSE:STAFF] Initial connection confirmed');
        return;
      }

      handleStaffEvent(data);
    } catch (error) {
      console.error('[SSE:STAFF] Error parsing message:', error);
    }
  };

  eventSource.onerror = (error) => {
    console.error('[SSE:STAFF] Connection error:', error);
    // EventSource will automatically attempt to reconnect
  };
}

/**
 * Stop SSE connection
 */
export function stopStaffSSE(): void {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
    console.log('[SSE:STAFF] Connection closed');
  }
  restaurantId = null;
  onQueueUpdate = null;
}

/**
 * Handle different types of staff events
 * Staff only gets notified when a customer RESERVES a table (not waitlist)
 */
function handleStaffEvent(data: any): void {
  if (!data.type) return;

  switch (data.type) {
    case 'table_reservation':
      handleTableReservation(data);
      break;
    default:
      console.log('[SSE:STAFF] Unknown event type:', data.type);
  }

  // Trigger queue refresh callback
  if (onQueueUpdate) {
    onQueueUpdate();
  }
}

function handleTableReservation(data: any): void {
  const reservation = data.reservation;
  if (!reservation) return;

  toast.success('New Table Reservation!', {
    description: `${reservation.name || 'Guest'} reserved a table (Party of ${reservation.partySize})`,
    duration: 6000,
  });
}

