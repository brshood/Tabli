import express from 'express';
import { z } from 'zod';
import { PushSubscription } from '../models/PushSubscription';
import { getVapidPublicKey, sendPushToReservation } from '../services/pushNotification';
import { Reservation } from '../models/Reservation';
export const pushRouter = express.Router();
const subscriptionSchema = z.object({
    endpoint: z.string().url(),
    keys: z.object({
        p256dh: z.string(),
        auth: z.string(),
    }),
    reservationId: z.string().optional(),
    userId: z.string().optional(),
    restaurantId: z.string().optional(), // For staff notifications
    userAgent: z.string().optional(),
});
/**
 * GET /push/vapid-public-key
 * Returns VAPID public key for client-side subscription
 */
pushRouter.get('/vapid-public-key', (req, res) => {
    const publicKey = getVapidPublicKey();
    if (!publicKey) {
        return res.status(503).json({ error: 'Push notifications not configured' });
    }
    res.json({ publicKey });
});
/**
 * POST /push/subscribe
 * Subscribe a client to push notifications
 */
pushRouter.post('/subscribe', async (req, res, next) => {
    try {
        const data = subscriptionSchema.parse(req.body);
        // Check if subscription already exists
        const existing = await PushSubscription.findOne({ endpoint: data.endpoint });
        const mongoose = require('mongoose');
        if (existing) {
            // Update existing subscription
            existing.keys = data.keys;
            existing.userId = data.userId || existing.userId;
            existing.reservationId = data.reservationId
                ? new mongoose.Types.ObjectId(data.reservationId)
                : existing.reservationId;
            existing.restaurantId = data.restaurantId
                ? new mongoose.Types.ObjectId(data.restaurantId)
                : existing.restaurantId;
            existing.userAgent = data.userAgent || existing.userAgent;
            await existing.save();
            return res.json({ success: true, message: 'Subscription updated' });
        }
        // Create new subscription
        const subscription = await PushSubscription.create({
            endpoint: data.endpoint,
            keys: data.keys,
            userId: data.userId,
            reservationId: data.reservationId
                ? new mongoose.Types.ObjectId(data.reservationId)
                : undefined,
            restaurantId: data.restaurantId
                ? new mongoose.Types.ObjectId(data.restaurantId)
                : undefined,
            userAgent: data.userAgent || req.get('user-agent'),
        });
        res.status(201).json({
            success: true,
            message: 'Subscription created',
            id: subscription._id.toString(),
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /push/unsubscribe
 * Unsubscribe a client from push notifications
 */
pushRouter.post('/unsubscribe', async (req, res, next) => {
    try {
        const { endpoint } = req.body;
        if (!endpoint || typeof endpoint !== 'string') {
            return res.status(400).json({ error: 'Endpoint is required' });
        }
        const result = await PushSubscription.deleteOne({ endpoint });
        res.json({
            success: true,
            message: 'Unsubscribed',
            deleted: result.deletedCount > 0,
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /push/test/:reservationId
 * Test endpoint to send a push notification to all subscriptions for a reservation
 */
pushRouter.post('/test/:reservationId', async (req, res, next) => {
    try {
        const reservationId = req.params.reservationId;
        // Verify reservation exists
        const reservation = await Reservation.findById(reservationId);
        if (!reservation) {
            return res.status(404).json({ error: 'Reservation not found' });
        }
        const sentCount = await sendPushToReservation(reservationId, {
            title: 'Test Notification',
            body: 'This is a test push notification from Tabli',
            icon: '/favicon.png',
            data: {
                reservationId: reservationId,
                url: '/#notifications',
            },
        });
        res.json({
            success: true,
            message: `Test notification sent to ${sentCount} subscription(s)`,
            sentCount,
        });
    }
    catch (err) {
        next(err);
    }
});
