import express from 'express';
import { z } from 'zod';
import { Reservation } from '../models/Reservation';
import { Restaurant } from '../models/Restaurant';
import { sendEmail, buildEmailTemplate, isValidEmailForSending } from '../services/email';
import { estimateWaitTimes } from '../services/waitTimeEstimator';
import { sendNotification } from '../services/sms';
import { sendSmsViaEand, normalizeMsisdn, normalizeNotificationMsisdn } from '../services/eandSmsClient';
import { getQueueJoinMessage, getRemovalMessage, getRestaurantQueueNotification } from '../services/smsMessages';
import { notificationEmitter } from '../services/notificationEmitter';
import { sendPushToReservation } from '../services/pushNotification';
import { computeQueuePosition } from '../services/queuePosition';
import { renumberQueueAndNotify } from '../services/queueSync';
import { env } from '../config/env';

export const queueRouter = express.Router();

const joinSchema = z.object({
  partySize: z.number().min(1).max(20),
  contactMethod: z.enum(['phone', 'email']),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
  seatingPreference: z.enum(['indoor', 'outdoor', 'no-preference']).optional(),
}).refine((data) => {
  // Require at least one contact method (phone or email)
  return !!(data.email || (data.phone && data.phone !== '0000000000'));
}, {
  message: 'At least one contact method (email or phone) is required',
  path: ['email', 'phone']
});

// POST /queue/:restaurantId/join
queueRouter.post('/:restaurantId/join', async (req, res, next) => {
  try {
    const data = joinSchema.parse(req.body);
    const restaurant = await Restaurant.findById(req.params.restaurantId);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    if ((restaurant as any).closedForCustomers === true) {
      return res.status(403).json({ error: 'This restaurant is not accepting new queue requests right now.' });
    }

    // #4 - Prevent Duplicate Bookings: Check for existing active reservation
    const duplicateQuery: any = {
      restaurantId: restaurant._id,
      status: { $in: ['pending', 'confirmed'] }
    };
    
    // Check by email and/or phone to prevent duplicates
    if (data.email) {
      duplicateQuery.email = data.email;
    }
    if (data.phone && data.phone !== '0000000000') {
      // If email is also provided, use $or to match either
      if (data.email) {
        duplicateQuery.$or = [
          { email: data.email },
          { phone: data.phone }
        ];
        delete duplicateQuery.email; // Remove direct email since we're using $or
      } else {
        duplicateQuery.phone = data.phone;
      }
    }
    
    const existingReservation = await Reservation.findOne(duplicateQuery);
    if (existingReservation) {
      return res.status(409).json({ 
        error: 'You already have an active reservation at this restaurant' 
      });
    }

    const doc = await Reservation.create({
      restaurantId: restaurant._id,
      mode: 'waitlist',
      name: data.name,
      partySize: data.partySize,
      contactMethod: data.contactMethod,
      phone: data.phone, // Always store phone
      email: data.email, // Always store email
      status: 'pending',
      queuePosition: undefined,
      seatingPreference: data.seatingPreference,
    });
    // Position is this customer's index in the line that is actually waiting right now
    const queuePosition = (await computeQueuePosition(restaurant._id, doc._id)) ?? 1;
    doc.queuePosition = queuePosition;
    await doc.save();

    const message = `You joined the queue at ${restaurant.name}. You're #${queuePosition}. We'll notify you when it's your turn.`;
    try {
      if (data.email && isValidEmailForSending(data.email)) {
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
            includeNotificationsLink: true,
          }),
        });
        
        // #3 - Mark email as sent on success
        doc.emailSent = true;
        await doc.save();
      }
    } catch (err) {
      console.error('Queue join notify failed:', (err as any)?.message);
      // emailSent remains false if email failed
    }
    
    // #1 - Send SMS notification if valid phone number is provided (regardless of contactMethod)
    // Note: Frontend may send contactMethod='email' even when phone is provided
    if (data.phone && data.phone !== '0000000000') {
      // Fire and forget - don't block queue join
      sendSmsViaEand({
        to: data.phone,
        text: getQueueJoinMessage({
          restaurantName: restaurant.name,
          queuePosition,
          waitTimeDisplayText: (restaurant as any).waitTimeDisplayText,
          waitTimeMinMinutes: (restaurant as any).waitTimeMinMinutes,
          waitTimeMaxMinutes: (restaurant as any).waitTimeMaxMinutes,
        }),
        category: 'otp',
      }).catch((smsError) => {
        console.error('[QUEUE] Failed to send SMS notification:', {
          error: smsError instanceof Error ? smsError.message : smsError,
          phone: data.phone,
          reservationId: doc._id,
          hasAccessToken: !!process.env.EAND_ACCESS_TOKEN,
          hasSenderId: !!process.env.EAND_SENDER_ID,
        });
        // Don't fail reservation if SMS fails
      });
    }
    
    // Send SMS notification to restaurant staff if they have notification phone configured
    if (restaurant.activeNotificationPhone) {
      const contact = data.phone && data.phone !== '0000000000' ? data.phone : (data.email || undefined);
      sendSmsViaEand({
        // Repair numbers saved before normalization was enforced (e.g. '+9710501234567')
        to: normalizeNotificationMsisdn(restaurant.activeNotificationPhone) || restaurant.activeNotificationPhone,
        text: getRestaurantQueueNotification({
          customerName: data.name,
          partySize: data.partySize,
          queuePosition,
          seatingPreference: data.seatingPreference,
          contact,
        }),
        category: 'otp',
      }).then(() => {
        console.log('[QUEUE] Staff SMS sent', {
          phone: restaurant.activeNotificationPhone,
          reservationId: doc._id,
        });
      }).catch((smsError) => {
        console.error('[QUEUE] Failed to send SMS to restaurant:', {
          error: smsError instanceof Error ? smsError.message : smsError,
          phone: restaurant.activeNotificationPhone,
          reservationId: doc._id,
        });
        // Don't fail queue join if SMS fails
      });
    }

    // Note: Staff notifications removed - they only get notified for actual table reservations, not waitlist entries

    res.status(201).json({ reservation: doc });
  } catch (err) { next(err); }
});

// POST /queue/:reservationId/notify
queueRouter.post('/:reservationId/notify', async (req, res, next) => {
  try {
    const r = await Reservation.findById(req.params.reservationId);
    if (!r) return res.status(404).json({ error: 'Not found' });
    const restaurant = await Restaurant.findById(r.restaurantId);
    const message = `Your table at ${restaurant?.name || 'the restaurant'} is ready! Please arrive within 15 minutes.`;
    if (r.email && isValidEmailForSending(r.email)) {
      try {
      await sendEmail({
        to: r.email as string,
        subject: restaurant?.name ? `${restaurant.name}: your table is ready` : 'Your table is ready',
        text: message,
        html: buildEmailTemplate({
          heading: 'Your table is ready!',
          intro: `Hi${r.name ? ` ${r.name}` : ''},`,
            lines: [
              restaurant?.name
                ? `Your table at ${restaurant.name} is ready. Please arrive within 15 minutes so we can keep it for you.`
                : 'Your table is ready. Please arrive within 15 minutes so we can keep it for you.',
            "If you're on your way, no action is needed. Otherwise, reply to this email to let us know.",
          ],
          includeNotificationsLink: true,
        }),
      });
      } catch (emailError) {
        console.error('Failed to send queue notification email:', emailError);
      }
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /queue/:reservationId/leave
queueRouter.post('/:reservationId/leave', async (req, res, next) => {
  try {
    const r = await Reservation.findById(req.params.reservationId);
    if (!r) return res.status(404).json({ error: 'Not found' });
    if (r.status === 'cancelled') return res.json({ success: true });
    const restaurant = await Restaurant.findById(r.restaurantId).lean();
    r.status = 'cancelled';
    r.leftAt = new Date();
    (r as any).cancellationReason = 'staff_removed'; // Track that staff removed them
    await r.save();
    try {
      if (r.email && isValidEmailForSending(r.email)) {
        const message = `We weren't able to hold your spot at ${restaurant?.name || 'the restaurant'} any longer. Reply if you still plan to join us.`;
        await sendEmail({
          to: r.email as string,
          subject: restaurant?.name ? `${restaurant.name} queue update` : 'Queue update',
          text: message,
          html: buildEmailTemplate({
            heading: 'We released your spot',
            intro: `Hi${r.name ? ` ${r.name}` : ''},`,
            lines: [
              restaurant?.name
                ? `We tried to reach you, but we need to release your place in line at ${restaurant.name}.`
                : 'We tried to reach you, but we need to release your place in line.',
              "If you're still planning to dine with us, reply to this email and we'll do our best to help.",
            ],
            includeNotificationsLink: true,
          }),
        });
      }
    } catch (notificationError) {
      console.error('Failed to send queue removal email:', notificationError);
    }
    
    // Send SMS notification - removed from queue
    if (r.phone && r.phone !== '0000000000') {
      // Fire and forget - don't block removal
      sendSmsViaEand({
        to: r.phone,
        text: getRemovalMessage({ restaurantName: restaurant?.name }),
        category: 'otp',
      }).catch((smsError) => {
        console.error('[QUEUE] Failed to send removal SMS:', {
          error: smsError instanceof Error ? smsError.message : smsError,
          phone: r.phone,
          reservationId: r._id,
          hasAccessToken: !!process.env.EAND_ACCESS_TOKEN,
          hasSenderId: !!process.env.EAND_SENDER_ID,
        });
        // Don't fail removal if SMS fails
      });
    }
    
    // Removing this guest closes the gap for everyone behind them
    await renumberQueueAndNotify(r.restaurantId);
    
    // Emit SSE notification for real-time updates (customer)
    notificationEmitter.notifyReservation((r._id as any).toString(), {
      type: 'reservation_updated',
      reservation: {
        _id: (r._id as any).toString(),
        status: r.status,
        queuePosition: r.queuePosition,
        leftAt: r.leftAt,
        cancellationReason: (r as any).cancellationReason,
      }
    });
    
    // Send push notification - removed from queue
    try {
      const base = (env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
      
      await sendPushToReservation((r._id as any).toString(), {
        title: 'Removed from Queue',
        body: `You've been removed from the queue at ${restaurant?.name || 'the restaurant'}.`,
        icon: '/favicon.png',
        data: {
          reservationId: (r._id as any).toString(),
          restaurantId: r.restaurantId.toString(),
          url: `${base}/#notifications`,
        },
      });
    } catch (pushError) {
      console.error('[PUSH] Failed to send removal notification:', pushError);
    }
    
    // Note: Staff notifications removed - they only get notified for actual table reservations
    
    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET /queue/:restaurantId/estimate
queueRouter.get('/:restaurantId/estimate', async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { partySize: partySizeParam } = req.query;

    const partySize =
      typeof partySizeParam === 'string' && partySizeParam.trim().length
        ? Number(partySizeParam)
        : undefined;

    const estimates = await estimateWaitTimes(restaurantId, {
      partySize: Number.isFinite(partySize) ? partySize : undefined,
    });

    res.json({ estimates });
  } catch (err) { next(err); }
});

