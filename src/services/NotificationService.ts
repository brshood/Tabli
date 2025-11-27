/**
 * Browser Notification Service
 * Handles requesting notification permission and showing browser notifications
 */

export type NotificationPermission = 'default' | 'granted' | 'denied';

class BrowserNotificationService {
  private permission: NotificationPermission = 'default';

  constructor() {
    // Check if browser supports notifications
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  /**
   * Check if browser supports notifications
   */
  isSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * Get current permission status
   */
  getPermission(): NotificationPermission {
    return this.permission;
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      console.warn('Browser does not support notifications');
      return 'denied';
    }

    if (this.permission === 'granted') {
      return 'granted';
    }

    try {
      const result = await Notification.requestPermission();
      this.permission = result;
      return result;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Show a notification
   */
  async showNotification(title: string, options?: NotificationOptions): Promise<boolean> {
    // Check permission first
    if (this.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    try {
      // Create notification
      const notification = new Notification(title, {
        icon: '/favicon.png',
        badge: '/apple-touch-icon.png',
        requireInteraction: false,
        ...options,
      });

      // Auto-close after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);

      return true;
    } catch (error) {
      console.error('Error showing notification:', error);
      return false;
    }
  }

  /**
   * Show a reservation notification
   */
  async notifyReservation(type: 'confirmed' | 'ready' | 'cancelled' | 'updated', restaurantName: string, message: string) {
    const titles = {
      confirmed: '✅ Reservation Confirmed',
      ready: '🍽️ Table Ready!',
      cancelled: '❌ Reservation Cancelled',
      updated: '🔔 Reservation Updated',
    };

    await this.showNotification(titles[type], {
      body: `${restaurantName}: ${message}`,
      tag: `reservation-${Date.now()}`, // Unique tag for each notification
    });
  }

  /**
   * Show a queue notification
   */
  async notifyQueue(restaurantName: string, queuePosition: number, estimatedWait?: string) {
    const message = estimatedWait
      ? `You're #${queuePosition} in line. Estimated wait: ${estimatedWait}`
      : `You're #${queuePosition} in line.`;

    await this.showNotification('📋 Queue Update', {
      body: `${restaurantName}: ${message}`,
      tag: `queue-${Date.now()}`,
    });
  }

  /**
   * Show a staff notification (for new queue entries, cancellations)
   */
  async notifyStaff(type: 'new_entry' | 'cancellation' | 'update', message: string) {
    const titles = {
      new_entry: '👥 New Queue Entry',
      cancellation: '❌ Cancellation',
      update: '🔔 Update',
    };

    await this.showNotification(titles[type], {
      body: message,
      tag: `staff-${Date.now()}`,
      requireInteraction: true, // Staff notifications require interaction
    });
  }
}

// Singleton instance
export const notificationService = new BrowserNotificationService();

