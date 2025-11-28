// Push Notification Subscription Service
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

let vapidPublicKey: string | null = null;
let registration: ServiceWorkerRegistration | null = null;

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Check current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  return Notification.permission;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Get or register service worker
 */
async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (registration) {
    return registration;
  }

  try {
    registration = await navigator.serviceWorker.register('/sw.js');
    console.log('[PUSH] Service Worker registered:', registration.scope);
    
    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    
    return registration;
  } catch (error) {
    console.error('[PUSH] Service Worker registration failed:', error);
    throw error;
  }
}

/**
 * Get VAPID public key from server
 */
async function getVapidPublicKey(): Promise<string> {
  if (vapidPublicKey) {
    return vapidPublicKey;
  }

  try {
    const response = await fetch(`${API_URL}/push/vapid-public-key`);
    if (!response.ok) {
      throw new Error('Failed to get VAPID public key');
    }
    const data = await response.json();
    vapidPublicKey = data.publicKey;
    return vapidPublicKey;
  } catch (error) {
    console.error('[PUSH] Failed to get VAPID public key:', error);
    throw error;
  }
}

/**
 * Convert VAPID public key to Uint8Array for subscription
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Request notification permission (iOS-safe - must be called directly from user gesture)
 * This function ensures service worker is ready before requesting permission
 */
export async function requestPermissionAndPrepareSubscription(): Promise<boolean> {
  try {
    // Check support
    if (!isPushSupported()) {
      console.warn('[PUSH] Push notifications not supported');
      return false;
    }

    // Check if already granted
    if (Notification.permission === 'granted') {
      console.log('[PUSH] Permission already granted');
      return true;
    }

    // CRITICAL for iOS: Register and wait for service worker to be ready BEFORE requesting permission
    const registration = await getServiceWorkerRegistration();
    await navigator.serviceWorker.ready; // Wait for service worker to be fully active
    
    // NOW request permission (must be directly from user gesture for iOS)
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('[PUSH] Notification permission denied');
      return false;
    }

    return true;
  } catch (error) {
    console.error('[PUSH] Failed to request permission:', error);
    return false;
  }
}

/**
 * Complete push notification subscription (called after permission is granted)
 */
export async function completeSubscription(options?: {
  reservationId?: string;
  userId?: string;
  restaurantId?: string;
}): Promise<PushSubscription | null> {
  try {
    if (!isPushSupported()) {
      return null;
    }

    const registration = await getServiceWorkerRegistration();
    await navigator.serviceWorker.ready;

    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      // Update subscription on server with new options
      await sendSubscriptionToServer(existingSubscription, options);
      return existingSubscription;
    }

    // Get VAPID public key
    const publicKey = await getVapidPublicKey();
    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // Create new subscription
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey,
    });

    // Send subscription to server
    await sendSubscriptionToServer(subscription, options);

    console.log('[PUSH] Successfully subscribed to push notifications');
    return subscription;
  } catch (error) {
    console.error('[PUSH] Failed to complete subscription:', error);
    throw error;
  }
}

/**
 * Subscribe to push notifications
 * For iOS compatibility, use requestPermissionAndPrepareSubscription() first
 * then call this function after async operations complete
 */
export async function subscribeToPush(options?: {
  reservationId?: string;
  userId?: string;
  restaurantId?: string; // For staff notifications
}): Promise<PushSubscription | null> {
  try {
    // Check support
    if (!isPushSupported()) {
      console.warn('[PUSH] Push notifications not supported');
      return null;
    }

    // Check permission status
    const permission = Notification.permission;
    if (permission === 'denied') {
      console.warn('[PUSH] Notification permission denied');
      return null;
    }

    if (permission !== 'granted') {
      // Permission not yet requested - request it now
      // NOTE: On iOS, this may fail if not called from user gesture
      const granted = await requestPermissionAndPrepareSubscription();
      if (!granted) {
        return null;
      }
    }

    // Complete the subscription
    return await completeSubscription(options);
  } catch (error) {
    console.error('[PUSH] Failed to subscribe:', error);
    throw error;
  }
}

/**
 * Send subscription to server
 */
async function sendSubscriptionToServer(
  subscription: PushSubscription,
  options?: { reservationId?: string; userId?: string; restaurantId?: string }
): Promise<void> {
  const subscriptionJSON = subscription.toJSON();

  if (!subscriptionJSON.keys) {
    throw new Error('Invalid subscription: missing keys');
  }

  const response = await fetch(`${API_URL}/push/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      endpoint: subscriptionJSON.endpoint,
      keys: {
        p256dh: subscriptionJSON.keys.p256dh,
        auth: subscriptionJSON.keys.auth,
      },
      reservationId: options?.reservationId,
      userId: options?.userId,
      restaurantId: options?.restaurantId,
      userAgent: navigator.userAgent,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to send subscription to server');
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<void> {
  try {
    if (!registration) {
      registration = await getServiceWorkerRegistration();
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return;
    }

    // Unsubscribe from browser
    await subscription.unsubscribe();

    // Remove from server
    const subscriptionJSON = subscription.toJSON();
    await fetch(`${API_URL}/push/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: subscriptionJSON.endpoint,
      }),
    });

    console.log('[PUSH] Successfully unsubscribed from push notifications');
  } catch (error) {
    console.error('[PUSH] Failed to unsubscribe:', error);
    throw error;
  }
}

/**
 * Check if currently subscribed
 */
export async function isSubscribed(): Promise<boolean> {
  try {
    if (!isPushSupported()) {
      return false;
    }

    if (!registration) {
      registration = await getServiceWorkerRegistration();
    }

    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (error) {
    console.error('[PUSH] Error checking subscription:', error);
    return false;
  }
}

