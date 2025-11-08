import express from 'express';
import { z } from 'zod';
import { Reservation } from '../models/Reservation';
import { Restaurant } from '../models/Restaurant';
import { sendEmail } from '../services/email';
import { sendSMS } from '../services/sms';
export const queueRouter = express.Router();
const joinSchema = z.object({
    partySize: z.number().min(1).max(20),
    contactMethod: z.enum(['phone', 'email']),
    phone: z.string().optional(),
    email: z.string().email().optional(),
});
// POST /queue/:restaurantId/join
queueRouter.post('/:restaurantId/join', async (req, res, next) => {
    try {
        const data = joinSchema.parse(req.body);
        const restaurant = await Restaurant.findById(req.params.restaurantId);
        if (!restaurant)
            return res.status(404).json({ error: 'Restaurant not found' });
        const count = await Reservation.countDocuments({ restaurantId: restaurant._id, mode: 'waitlist', status: { $in: ['pending', 'confirmed'] } });
        const queuePosition = count + 1;
        const doc = await Reservation.create({
            restaurantId: restaurant._id,
            mode: 'waitlist',
            partySize: data.partySize,
            contactMethod: data.contactMethod,
            phone: data.contactMethod === 'phone' ? data.phone : undefined,
            email: data.contactMethod === 'email' ? data.email : undefined,
            status: 'pending',
            queuePosition,
        });
        const message = `You joined the queue at ${restaurant.name}. You're #${queuePosition}. We'll notify you when it's your turn.`;
        try {
            if (data.contactMethod === 'phone' && data.phone)
                await sendSMS({ to: data.phone, message });
            if (data.contactMethod === 'email' && data.email)
                await sendEmail({ to: data.email, subject: `Queue at ${restaurant.name}`, text: message });
        }
        catch (err) {
            console.error('Queue join notify failed:', err?.message);
        }
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
        const message = `Your table at ${restaurant?.name || 'the restaurant'} is ready! Please arrive within 10 minutes.`;
        if (r.contactMethod === 'phone' && r.phone)
            await sendSMS({ to: r.phone, message });
        if (r.contactMethod === 'email' && r.email)
            await sendEmail({ to: r.email, subject: 'Your turn', text: message });
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
        await r.save();
        try {
            if (r.contactMethod === 'phone' && r.phone) {
                const message = `We weren't able to hold your spot at ${restaurant?.name || 'the restaurant'} any longer. Reply if you still plan to join us.`;
                await sendSMS({ to: r.phone, message });
            }
        }
        catch (notificationError) {
            console.error('Failed to send queue removal SMS:', notificationError);
        }
        if (typeof oldPos === 'number') {
            await Reservation.updateMany({ restaurantId: r.restaurantId, mode: 'waitlist', status: { $in: ['pending', 'confirmed'] }, queuePosition: { $gt: oldPos } }, { $inc: { queuePosition: -1 } });
        }
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
