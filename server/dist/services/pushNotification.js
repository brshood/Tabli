import webpush from 'web-push';
import { env } from '../config/env';
import { PushSubscription } from '../models/PushSubscription';
import mongoose from 'mongoose';
// Initialize VAPID keys if available
if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(env.VAPID_SUBJECT || 'mailto:tabli.team@gmail.com', env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
    console.log('[PUSH] VAPID keys configured');
}
else {
    console.warn('[PUSH] VAPID keys not configured. Push notifications will not work.');
}
/**
 * Send push notification to a single subscription
 */
export async function sendPushNotification(subscription, payload) {
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
        console.warn('[PUSH] Cannot send push notification: VAPID keys not configured');
        return;
    }
    try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        console.log('[PUSH] Notification sent successfully');
    }
    catch (error) {
        console.error('[PUSH] Failed to send notification:', error);
        // If subscription is invalid (410), mark it for deletion
        if (error.statusCode === 410) {
            console.log('[PUSH] Subscription expired (410), will be cleaned up');
            await PushSubscription.deleteOne({ endpoint: subscription.endpoint });
            throw new Error('Subscription expired');
        }
        throw error;
    }
}
/**
 * Send push notification to all subscriptions for a user (email or phone)
 */
export async function sendPushToUser(userId, payload) {
    const subscriptions = await PushSubscription.find({ userId }).lean();
    let sentCount = 0;
    for (const sub of subscriptions) {
        try {
            await sendPushNotification({
                endpoint: sub.endpoint,
                keys: sub.keys,
            }, payload);
            sentCount++;
        }
        catch (error) {
            console.error(`[PUSH] Failed to send to subscription ${sub.endpoint}:`, error);
            // Continue with other subscriptions
        }
    }
    return sentCount;
}
/**
 * Send push notification to all subscriptions for a reservation
 */
export async function sendPushToReservation(reservationId, payload) {
    const id = typeof reservationId === 'string'
        ? new mongoose.Types.ObjectId(reservationId)
        : reservationId;
    const subscriptions = await PushSubscription.find({ reservationId: id }).lean();
    let sentCount = 0;
    for (const sub of subscriptions) {
        try {
            await sendPushNotification({
                endpoint: sub.endpoint,
                keys: sub.keys,
            }, payload);
            sentCount++;
        }
        catch (error) {
            console.error(`[PUSH] Failed to send to subscription ${sub.endpoint}:`, error);
            // Continue with other subscriptions
        }
    }
    return sentCount;
}
/**
 * Send push notification to all subscriptions for a restaurant (staff notifications)
 */
export async function sendPushToRestaurant(restaurantId, payload) {
    const id = typeof restaurantId === 'string'
        ? new mongoose.Types.ObjectId(restaurantId)
        : restaurantId;
    const subscriptions = await PushSubscription.find({ restaurantId: id }).lean();
    let sentCount = 0;
    for (const sub of subscriptions) {
        try {
            await sendPushNotification({
                endpoint: sub.endpoint,
                keys: sub.keys,
            }, payload);
            sentCount++;
        }
        catch (error) {
            console.error(`[PUSH] Failed to send to subscription ${sub.endpoint}:`, error);
            // Continue with other subscriptions
        }
    }
    return sentCount;
}
/**
 * Get VAPID public key for client-side subscription
 */
export function getVapidPublicKey() {
    return env.VAPID_PUBLIC_KEY || null;
}
