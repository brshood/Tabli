import express from 'express';
import { z } from 'zod';
import { Reservation } from '../models/Reservation';
import { Restaurant } from '../models/Restaurant';
import { sendEmail, buildEmailTemplate } from '../services/email';
import { estimateWaitTimes } from '../services/waitTimeEstimator';
import { sendNotification } from '../services/sms';
import { notificationEmitter } from '../services/notificationEmitter';
import { sendPushToReservation } from '../services/pushNotification';
import { env } from '../config/env';
export const queueRouter = express.Router();
const joinSchema = z.object({
    partySize: z.number().min(1).max(20),
    contactMethod: z.enum(['phone', 'email']),
    phone: z.string(),
    email: z.string().email(),
    name: z.string().min(1).max(100).optional(),
}).refine((data) => {
    // Require both email and phone
    return !!(data.email && data.phone);
}, {
    message: 'Both email and phone number are required',
    path: ['email', 'phone']
});
// POST /queue/:restaurantId/join
queueRouter.post('/:restaurantId/join', async (req, res, next) => {
    try {
        const data = joinSchema.parse(req.body);
        const restaurant = await Restaurant.findById(req.params.restaurantId);
        if (!restaurant)
            return res.status(404).json({ error: 'Restaurant not found' });
        // #4 - Prevent Duplicate Bookings: Check for existing active reservation
        const duplicateQuery = {
            restaurantId: restaurant._id,
            status: { $in: ['pending', 'confirmed'] }
        };
        // Check by email or phone depending on contact method
        if (data.email) {
            duplicateQuery.email = data.email;
        }
        else if (data.phone) {
            duplicateQuery.phone = data.phone;
        }
        const existingReservation = await Reservation.findOne(duplicateQuery);
        if (existingReservation) {
            return res.status(409).json({
                error: 'You already have an active reservation at this restaurant'
            });
        }
        const count = await Reservation.countDocuments({ restaurantId: restaurant._id, mode: 'waitlist', status: { $in: ['pending', 'confirmed'] } });
        const queuePosition = count + 1;
        const doc = await Reservation.create({
            restaurantId: restaurant._id,
            mode: 'waitlist',
            name: data.name,
            partySize: data.partySize,
            contactMethod: data.contactMethod,
            phone: data.phone, // Always store phone
            email: data.email, // Always store email
            status: 'pending',
            queuePosition,
        });
        const message = `You joined the queue at ${restaurant.name}. You're #${queuePosition}. We'll notify you when it's your turn.`;
        try {
            if (data.email) {
                await sendEmail({
                    to: data.email,
                    subject: `Queue at ${restaurant.name}`,
                    text: message,
                    html: buildEmailTemplate({
                        heading: `Thanks for joining the queue at ${restaurant.name}`,
                        intro: doc.name ? `Hi ${doc.name},` : 'Hello,',
                        lines: [
                            `You're currently #${queuePosition} in line at ${restaurant.name}.`,
                            'We\'ll email you as soon as your table is ready.',
                        ],
                        footer: 'Need to make a change? Reply to this email and we\'ll help you out.',
                    }),
                });
                // #3 - Mark email as sent on success
                doc.emailSent = true;
                await doc.save();
            }
        }
        catch (err) {
            console.error('Queue join notify failed:', err?.message);
            // emailSent remains false if email failed
        }
        // #1 - Send SMS notification if phone contact method
        if (data.contactMethod === 'phone' && data.phone) {
            try {
                const smsMessage = `Hello! You've been added to the waitlist at ${restaurant.name}. We'll let you know as soon as your table is ready. Thank you for your patience!`;
                await sendNotification({
                    to: data.phone,
                    message: smsMessage
                });
            }
            catch (smsError) {
                console.error('Failed to send SMS notification:', smsError);
                // Don't fail reservation if SMS fails
            }
        }
        // Note: Staff notifications removed - they only get notified for actual table reservations, not waitlist entries
        res.status(201).json({ reservation: doc });
    }
    catch (err) {
        next(err);
    }
});
// POST /queue/:reservationId/notify
queueRouter.post('/:reservationId/notify', async (req, res, next) => {
    try {
        const r = await Reservation.findById(req.params.reservationId);
        if (!r)
            return res.status(404).json({ error: 'Not found' });
        const restaurant = await Restaurant.findById(r.restaurantId);
        const message = `Your table at ${restaurant?.name || 'the restaurant'} is ready! Please arrive within 15 minutes.`;
        if (r.email) {
            await sendEmail({
                to: r.email,
                subject: restaurant?.name ? `${restaurant.name}: your table is ready` : 'Your table is ready',
                text: message,
                html: buildEmailTemplate({
                    heading: 'Your table is ready!',
                    intro: `Hi${r.name ? ` ${r.name}` : ''},`,
                    lines: [
                        restaurant?.name
                            ? `Your table at ${restaurant.name} is ready. Please arrive within 15 minutes so we can keep it for you.`
                            : 'Your table is ready. Please arrive within 15 minutes so we can keep it for you.',
                        'If you’re on your way, no action is needed. Otherwise, reply to this email to let us know.',
                    ],
                }),
            });
        }
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
// POST /queue/:reservationId/leave
queueRouter.post('/:reservationId/leave', async (req, res, next) => {
    try {
        const r = await Reservation.findById(req.params.reservationId);
        if (!r)
            return res.status(404).json({ error: 'Not found' });
        if (r.status === 'cancelled')
            return res.json({ success: true });
        const restaurant = await Restaurant.findById(r.restaurantId).lean();
        const oldPos = r.queuePosition;
        r.status = 'cancelled';
        r.leftAt = new Date();
        r.cancellationReason = 'staff_removed'; // Track that staff removed them
        await r.save();
        try {
            if (r.email) {
                const message = `We weren't able to hold your spot at ${restaurant?.name || 'the restaurant'} any longer. Reply if you still plan to join us.`;
                await sendEmail({
                    to: r.email,
                    subject: restaurant?.name ? `${restaurant.name} queue update` : 'Queue update',
                    text: message,
                    html: buildEmailTemplate({
                        heading: 'We released your spot',
                        intro: `Hi${r.name ? ` ${r.name}` : ''},`,
                        lines: [
                            restaurant?.name
                                ? `We tried to reach you, but we need to release your place in line at ${restaurant.name}.`
                                : 'We tried to reach you, but we need to release your place in line.',
                            'If you’re still planning to dine with us, reply to this email and we’ll do our best to help.',
                        ],
                    }),
                });
            }
        }
        catch (notificationError) {
            console.error('Failed to send queue removal email:', notificationError);
        }
        if (typeof oldPos === 'number') {
            await Reservation.updateMany({ restaurantId: r.restaurantId, mode: 'waitlist', status: { $in: ['pending', 'confirmed'] }, queuePosition: { $gt: oldPos } }, { $inc: { queuePosition: -1 } });
        }
        // Emit SSE notification for real-time updates (customer)
        notificationEmitter.notifyReservation(r._id.toString(), {
            type: 'reservation_updated',
            reservation: {
                _id: r._id.toString(),
                status: r.status,
                queuePosition: r.queuePosition,
                leftAt: r.leftAt,
                cancellationReason: r.cancellationReason,
            }
        });
        // Send push notification - removed from queue
        try {
            const base = (env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
            await sendPushToReservation(r._id.toString(), {
                title: 'Removed from Queue',
                body: `You've been removed from the queue at ${restaurant?.name || 'the restaurant'}.`,
                icon: '/favicon.png',
                data: {
                    reservationId: r._id.toString(),
                    restaurantId: r.restaurantId.toString(),
                    url: `${base}/#notifications`,
                },
            });
        }
        catch (pushError) {
            console.error('[PUSH] Failed to send removal notification:', pushError);
        }
        // Note: Staff notifications removed - they only get notified for actual table reservations
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
// GET /queue/:restaurantId/estimate
queueRouter.get('/:restaurantId/estimate', async (req, res, next) => {
    try {
        const { restaurantId } = req.params;
        const { partySize: partySizeParam } = req.query;
        const partySize = typeof partySizeParam === 'string' && partySizeParam.trim().length
            ? Number(partySizeParam)
            : undefined;
        const estimates = await estimateWaitTimes(restaurantId, {
            partySize: Number.isFinite(partySize) ? partySize : undefined,
        });
        res.json({ estimates });
    }
    catch (err) {
        next(err);
    }
});
