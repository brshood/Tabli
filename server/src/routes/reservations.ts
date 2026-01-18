import express from 'express';
import { z } from 'zod';
import { Reservation } from '../models/Reservation';
import { Restaurant } from '../models/Restaurant';
import { Table } from '../models/Table';
import { sendEmail, buildEmailTemplate, isValidEmailForSending } from '../services/email';
import { sendNotification } from '../services/sms';
import { sendSmsViaEand, normalizeMsisdn } from '../services/eandSmsClient';
import { getReservationConfirmationMessage, getQueueJoinMessage, getTableReadyMessage, getRemovalMessage, getRestaurantReservationNotification, getRestaurantQueueNotification } from '../services/smsMessages';
import { notificationEmitter } from '../services/notificationEmitter';
import { formatUaeTime, getGSTStartOfDay, getGSTEndOfDay } from '../utils/dateFormat';
import { sendPushToReservation, sendPushToUser, sendPushToRestaurant } from '../services/pushNotification';
import { env } from '../config/env';

export const reservationsRouter = express.Router();

const createSchema = z.object({
  restaurantId: z.string(),
  mode: z.enum(['reserve', 'waitlist']),
  name: z.string().min(1).max(100).optional(),
  partySize: z.number().min(1).max(20),
  contactMethod: z.enum(['phone', 'email']),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  gender: z.enum(['male', 'female', 'prefer-not-to-say']).optional(),
  seatingPreference: z.enum(['indoor', 'outdoor', 'no-preference']).optional(),
}).refine((data) => {
  // Require at least one contact method (phone or email)
  // Walk-ins use placeholder '0000000000' for phone
  return !!(data.email || (data.phone && data.phone !== '0000000000'));
}, {
  message: 'At least one contact method (email or phone) is required',
  path: ['email', 'phone']
});

reservationsRouter.post('/', async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    
    // #4 - Prevent Duplicate Bookings: Check for existing active reservation
    const isWalkIn = data.phone === '0000000000';
    if (!isWalkIn) {
      const duplicateQuery: any = {
        restaurantId: data.restaurantId,
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
    }
    
    // Detect walk-ins (staff-initiated manual seating) by placeholder phone number
    
    // Determine reservation type and status
    // All customers (except walk-ins) go to waitlist by default
    let status: any = 'pending';
    let reservationType: 'reserved' | 'waitlist' | undefined = undefined;
    
    if (isWalkIn) {
      // Walk-ins are handled separately - they will be manually assigned by staff
      // Don't set reservationType for walk-ins
    } else {
      // For both 'reserve' and 'waitlist' modes, always set status to 'pending'
      // Determine reservationType based on mode and table availability
      // Filter tables by seating preference location
      const seatingPref = data.seatingPreference;
      let tableQuery: any = {
        restaurantId: data.restaurantId,
        status: 'available',
        capacity: { $gte: data.partySize }
      };
      
      if (seatingPref === 'indoor') {
        tableQuery.location = 'indoor';
      } else if (seatingPref === 'outdoor') {
        tableQuery.location = 'outdoor';
      }
      // For 'no-preference' or undefined, don't filter by location (check both)
      
      const availableTables = await Table.find(tableQuery).lean();
      const capacities = availableTables.map(t => t.capacity);
      const maxCapacity = capacities.length ? Math.max(...capacities) : 0;
      
      if (data.mode === 'reserve' && data.partySize <= maxCapacity && availableTables.length > 0) {
        // Table was available when they reserved for their selected location
        reservationType = 'reserved';
      } else {
        // No table available for selected location or mode is 'waitlist'
        reservationType = 'waitlist';
      }
    }
    
    // Calculate queue position based on seating preference for waitlist mode
    // Also calculate when mode is 'reserve' but reservationType becomes 'waitlist' (no tables available)
    let queuePosition: number | undefined = undefined;
    if (data.mode === 'waitlist' || reservationType === 'waitlist') {
      const seatingPref = data.seatingPreference || 'no-preference';
      
      // For queue position calculation, we need to count ALL waitlist reservations
      // (both mode='waitlist' and mode='reserve' with reservationType='waitlist')
      
      if (seatingPref === 'indoor') {
        // Count customers in indoor queue (indoor + no-preference)
        // Include both waitlist mode and reserve mode with waitlist type
        const indoorCount = await Reservation.countDocuments({ 
          restaurantId: data.restaurantId, 
          status: { $in: ['pending', 'confirmed'] },
          $or: [
            { mode: 'waitlist', seatingPreference: { $in: ['indoor', 'no-preference', null] } },
            { mode: 'waitlist', seatingPreference: { $exists: false } },
            { mode: 'reserve', reservationType: 'waitlist', seatingPreference: { $in: ['indoor', 'no-preference', null] } },
            { mode: 'reserve', reservationType: 'waitlist', seatingPreference: { $exists: false } }
          ]
        });
        queuePosition = indoorCount + 1;
      } else if (seatingPref === 'outdoor') {
        // Count customers in outdoor queue (outdoor + no-preference)
        const outdoorCount = await Reservation.countDocuments({ 
          restaurantId: data.restaurantId, 
          status: { $in: ['pending', 'confirmed'] },
          $or: [
            { mode: 'waitlist', seatingPreference: { $in: ['outdoor', 'no-preference', null] } },
            { mode: 'waitlist', seatingPreference: { $exists: false } },
            { mode: 'reserve', reservationType: 'waitlist', seatingPreference: { $in: ['outdoor', 'no-preference', null] } },
            { mode: 'reserve', reservationType: 'waitlist', seatingPreference: { $exists: false } }
          ]
        });
        queuePosition = outdoorCount + 1;
      } else {
        // No-preference: show the smaller queue position (could be seated at either)
        const [indoorCount, outdoorCount] = await Promise.all([
          Reservation.countDocuments({ 
            restaurantId: data.restaurantId, 
            status: { $in: ['pending', 'confirmed'] },
            $or: [
              { mode: 'waitlist', seatingPreference: { $in: ['indoor', 'no-preference', null] } },
              { mode: 'waitlist', seatingPreference: { $exists: false } },
              { mode: 'reserve', reservationType: 'waitlist', seatingPreference: { $in: ['indoor', 'no-preference', null] } },
              { mode: 'reserve', reservationType: 'waitlist', seatingPreference: { $exists: false } }
            ]
          }),
          Reservation.countDocuments({ 
            restaurantId: data.restaurantId, 
            status: { $in: ['pending', 'confirmed'] },
            $or: [
              { mode: 'waitlist', seatingPreference: { $in: ['outdoor', 'no-preference', null] } },
              { mode: 'waitlist', seatingPreference: { $exists: false } },
              { mode: 'reserve', reservationType: 'waitlist', seatingPreference: { $in: ['outdoor', 'no-preference', null] } },
              { mode: 'reserve', reservationType: 'waitlist', seatingPreference: { $exists: false } }
            ]
          })
        ]);
        queuePosition = Math.min(indoorCount, outdoorCount) + 1;
      }
    }

    const doc = await Reservation.create({
      restaurantId: data.restaurantId,
      name: data.name,
      mode: data.mode,
      partySize: data.partySize,
      contactMethod: data.contactMethod,
      phone: data.phone, // Always store phone (walk-ins use '0000000000')
      email: data.email, // Always store email
      status,
      queuePosition,
      confirmedAt: status !== 'pending' ? new Date() : undefined,
      seatedAt: status === 'seated' ? new Date() : undefined,
      gender: data.gender,
      seatingPreference: data.seatingPreference,
      reservationType,
    });

    // #3 - Send confirmation notification and track emailSent
    const restaurant = await Restaurant.findById(data.restaurantId);
    if (restaurant) {
      // Use reservationType to determine if this is a queue/waitlist (more accurate than mode)
      const isWaitlist = reservationType === 'waitlist' || data.mode === 'waitlist';
      const message = isWaitlist
        ? `Thank you for joining the queue at ${restaurant.name}! You're #${queuePosition} in line. We'll notify you when your table is ready.`
        : `Your reservation request for ${restaurant.name} has been received. We'll contact you shortly to confirm.`;
      
      try {
        if (data.email && isValidEmailForSending(data.email)) {
          const introName = data.name ? `Hi ${data.name},` : 'Hello,';
          
          // #11 - Construct frontend URL for cancel link
          const frontendUrl = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
          const cancelUrl = `${frontendUrl}/#cancel-reservation?id=${doc._id}`;
          
          await sendEmail({
            to: data.email as string,
            subject: `Reservation at ${restaurant.name}`,
            text: message,
            html: buildEmailTemplate({
              heading: isWaitlist
                ? `You're on the waitlist at ${restaurant.name}`
                : `We've received your reservation`,
              intro: introName,
              lines: isWaitlist
                ? [
                    `You're currently #${queuePosition} in line at ${restaurant.name}.`,
                    "We'll email you again when your table is ready.",
                    'Need to cancel? Click the button below.',
                  ]
                : [
                    `Thanks for choosing ${restaurant.name}. We're reviewing your reservation request and will confirm shortly.`,
                    'Need to cancel? Click the button below.',
                  ],
              actionText: 'Cancel Reservation',
              actionUrl: cancelUrl,
              footer: "Questions? Reply to this email and we'll get right back to you.",
              includeNotificationsLink: true,
            }),
          });
          
          // #3 - Mark email as sent on success
          doc.emailSent = true;
          await doc.save();
          console.log(`[RESERVATION] Confirmation email sent successfully to ${data.email} for reservation ${doc._id}`);
        } else {
          console.warn(`[RESERVATION] Email not sent - invalid or missing email:`, {
            email: data.email,
            reservationId: doc._id,
            isValid: data.email ? isValidEmailForSending(data.email) : false
          });
        }
      } catch (err) {
        // Log but don't fail reservation if notification fails
        console.error('[RESERVATION] Failed to send confirmation email:', {
          error: err instanceof Error ? err.message : err,
          email: data.email,
          reservationId: doc._id,
          restaurantId: data.restaurantId
        });
        // emailSent remains false if email failed
      }
      
      // #1 - Send SMS notification if valid phone number is provided (regardless of contactMethod)
      // Note: Frontend may send contactMethod='email' even when phone is provided
      // Use reservationType to determine message type (more accurate than mode)
      if (data.phone && data.phone !== '0000000000') {
        // Fire and forget - don't block reservation creation
        sendSmsViaEand({
          to: data.phone,
          text: isWaitlist
            ? getQueueJoinMessage({ restaurantName: restaurant.name, queuePosition })
            : getReservationConfirmationMessage({ restaurantName: restaurant.name }),
          category: 'otp',
        }).catch((smsError) => {
          console.error('[RESERVATION] Failed to send SMS notification:', {
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
      // Use reservationType to determine message type (more accurate than mode)
      if (restaurant.activeNotificationPhone) {
        const smsText = isWaitlist
          ? getRestaurantQueueNotification({
              customerName: data.name,
              partySize: data.partySize,
              queuePosition,
              seatingPreference: data.seatingPreference,
            })
          : getRestaurantReservationNotification({
              customerName: data.name,
              partySize: data.partySize,
              seatingPreference: data.seatingPreference,
            });
        
        sendSmsViaEand({
          to: restaurant.activeNotificationPhone,
          text: smsText,
          category: 'otp',
        }).catch((smsError) => {
          console.error('[RESERVATION] Failed to send SMS to restaurant:', {
            error: smsError instanceof Error ? smsError.message : smsError,
            phone: restaurant.activeNotificationPhone,
            reservationId: doc._id,
          });
          // Don't fail reservation if SMS fails
        });
      }
    }

    // Notify staff ONLY when a table is actually reserved (not waitlist)
    if (reservationType === 'reserved') {
      // SSE notification for active browser connections (toast)
      notificationEmitter.notifyStaff(data.restaurantId, {
        type: 'table_reservation',
        event: 'new_table_reservation',
        reservation: {
          _id: (doc._id as any).toString(),
          name: doc.name,
          partySize: doc.partySize,
          contactMethod: doc.contactMethod,
          requestedAt: doc.requestedAt,
        },
        timestamp: new Date().toISOString(),
      });

      // Push notification for staff (works even when browser is closed)
      try {
        const base = (env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
        await sendPushToRestaurant(data.restaurantId, {
          title: 'New Table Reservation!',
          body: `${doc.name || 'Guest'} reserved a table (Party of ${doc.partySize})`,
          icon: '/favicon.png',
          data: {
            restaurantId: data.restaurantId,
            reservationId: (doc._id as any).toString(),
            url: `${base}/#staff`,
          },
        });
        console.log('[PUSH:STAFF] Sent push notification for new table reservation');
      } catch (pushError) {
        console.error('[PUSH:STAFF] Failed to send push notification:', pushError);
        // Don't fail reservation creation if push fails
      }
    }

    res.status(201).json({ reservation: doc });
  } catch (err) { next(err); }
});

// GET /reservations/:id - Fetch a single reservation by ID
reservationsRouter.get('/:id', async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id).lean();
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    res.json({ reservation });
  } catch (err) {
    next(err);
  }
});

reservationsRouter.get('/', async (req, res, next) => {
  try {
    const { restaurantId, status, date } = req.query as any;
    const filter: any = {};
    if (restaurantId) filter.restaurantId = restaurantId;
    if (status) filter.status = status;
    if (date) {
      // date is expected to be YYYY-MM-DD format, interpret as GST date
      const startDate = typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)
        ? new Date(`${date}T00:00:00+04:00`) // GST midnight
        : getGSTStartOfDay(new Date(date));
      const end = getGSTEndOfDay(startDate);
      filter.requestedAt = { $gte: startDate, $lte: end };
    }
    const items = await Reservation.find(filter).sort({ requestedAt: 1 }).lean();
    
    // Ensure ObjectIds are converted to strings for easier frontend handling
    const formatted = items.map(item => ({
      ...item,
      _id: item._id.toString(),
      restaurantId: item.restaurantId.toString(),
      tableId: item.tableId ? item.tableId.toString() : undefined
    }));
    
    res.json({ items: formatted });
  } catch (err) { next(err); }
});

const patchSchema = z.object({
  status: z.enum(['pending','confirmed','seated','cancelled','no_show']).optional(),
  queuePosition: z.number().optional(),
  tableId: z.string().optional(),
  leftAt: z.string().optional(), // Allow explicit setting of leftAt for checkout
  calledAt: z.string().nullable().optional(), // Allow setting calledAt timestamp (null to unmark)
  cancellationReason: z.enum(['user_cancelled', 'daily_reset', 'no_show', 'hold_expired', 'staff_removed']).optional(),
});

reservationsRouter.patch('/:id', async (req, res, next) => {
  try {
    const data = patchSchema.parse(req.body);
    const r = await Reservation.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    const prevStatus = r.status;
    
    // Validate status transitions
    if (data.status && data.status !== prevStatus) {
      // Prevent direct status change to 'seated' without a table assignment
      // Use POST /reservations/:id/assign-table instead
      if (data.status === 'seated') {
        return res.status(400).json({ 
          error: 'Cannot directly set status to seated. Use POST /reservations/:id/assign-table endpoint to properly assign a table.' 
        });
      }
      
      if (data.status === 'confirmed') {
        r.confirmedAt = new Date();
        
        // #2 - Set 15-minute hold when staff checks in customer
        const holdUntil = new Date();
        holdUntil.setMinutes(holdUntil.getMinutes() + 15);
        r.holdUntil = holdUntil;
        r.holdStatus = 'active';
        
        // Recalculate queue positions if customer was in waitlist queue
        // When checked in, they're still in queue but we need to notify others of position changes
        if (r.mode === 'waitlist' && typeof r.queuePosition === 'number') {
          // Customer is being checked in but still in queue - no position change needed
          // Queue positions will update when they're seated or removed
        }
        
        // Send email notification about hold
        if (r.email && isValidEmailForSending(r.email)) {
          try {
            const restaurant = await Restaurant.findById(r.restaurantId).lean();
            const holdTime = formatUaeTime(holdUntil);
            
            await sendEmail({
              to: r.email as string,
              subject: `Your table is ready at ${restaurant?.name || 'your restaurant'}`,
              text: `Your table is ready! Please arrive by ${holdTime} to secure your reservation.`,
              html: buildEmailTemplate({
                heading: 'Your table is ready!',
                intro: r.name ? `Hi ${r.name},` : 'Hello,',
                lines: [
                  `Great news! Your table at ${restaurant?.name || 'the restaurant'} is ready.`,
                  `Please arrive by ${holdTime} (within the next 15 minutes) to secure your reservation.`,
                  `If you can't make it, please let us know as soon as possible.`
                ],
                footer: 'See you soon!',
                includeNotificationsLink: true,
              })
            });
            console.log(`[RESERVATION] Check-in email sent successfully to ${r.email} for reservation ${r._id}`);
          } catch (emailError) {
            console.error('[RESERVATION] Failed to send check-in email:', {
              error: emailError instanceof Error ? emailError.message : emailError,
              email: r.email,
              reservationId: r._id,
              restaurantId: r.restaurantId
            });
          }
        } else {
          console.warn(`[RESERVATION] Check-in email not sent - invalid or missing email:`, {
            email: r.email,
            reservationId: r._id,
            isValid: r.email ? isValidEmailForSending(r.email) : false
          });
        }

        // Send SMS notification - table is ready
        if (r.phone && r.phone !== '0000000000') {
          // Fire and forget - don't block status update
          const restaurant = await Restaurant.findById(r.restaurantId).lean();
          sendSmsViaEand({
            to: r.phone,
            text: getTableReadyMessage({ restaurantName: restaurant?.name }),
            category: 'otp',
          }).catch((smsError) => {
            console.error('[RESERVATION] Failed to send table ready SMS:', {
              error: smsError instanceof Error ? smsError.message : smsError,
              phone: r.phone,
              reservationId: r._id,
              hasAccessToken: !!process.env.EAND_ACCESS_TOKEN,
              hasSenderId: !!process.env.EAND_SENDER_ID,
            });
            // Don't fail status update if SMS fails
          });
        }

        // Send push notification - table is ready
        try {
          const restaurant = await Restaurant.findById(r.restaurantId).lean();
          const base = (env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
          const holdTime = formatUaeTime(holdUntil);
          
          await sendPushToReservation((r._id as any).toString(), {
            title: '🎉 Table Ready!',
            body: `Your table at ${restaurant?.name || 'the restaurant'} is ready! Please arrive by ${holdTime} (within 15 minutes).`,
            icon: '/favicon.png',
            data: {
              reservationId: (r._id as any).toString(),
              restaurantId: r.restaurantId.toString(),
              url: `${base}/#notifications`,
            },
          });
        } catch (pushError) {
          console.error('[PUSH] Failed to send table ready notification:', pushError);
        }
      }
      if (data.status === 'cancelled' || data.status === 'no_show') r.leftAt = new Date();
      r.status = data.status;
      
      // Send SMS notification when reservation is cancelled (staff removal)
      if (data.status === 'cancelled' && prevStatus !== 'cancelled') {
        // Only send SMS if this is a staff removal (not user cancellation)
        // User cancellations are handled by POST /reservations/:id/cancel endpoint
        const cancellationReason = (r as any).cancellationReason || data.cancellationReason;
        if (cancellationReason === 'staff_removed' || cancellationReason === 'no_show' || cancellationReason === 'hold_expired') {
          if (r.phone && r.phone !== '0000000000') {
            // Fire and forget - don't block status update
            const restaurant = await Restaurant.findById(r.restaurantId).lean();
            sendSmsViaEand({
              to: r.phone,
              text: getRemovalMessage({ restaurantName: restaurant?.name }),
              category: 'otp',
            }).catch((smsError) => {
              console.error('[RESERVATION] Failed to send cancellation SMS:', {
                error: smsError instanceof Error ? smsError.message : smsError,
                phone: r.phone,
                reservationId: r._id,
                hasAccessToken: !!process.env.EAND_ACCESS_TOKEN,
                hasSenderId: !!process.env.EAND_SENDER_ID,
              });
              // Don't fail status update if SMS fails
            });
          }
        }
      }
    }
    const prevQueuePosition = r.queuePosition;
    if (typeof data.queuePosition === 'number') r.queuePosition = data.queuePosition;
    if (data.tableId) (r as any).tableId = data.tableId;
    // Allow explicit setting of leftAt (for checkout without status change)
    if (data.leftAt) r.leftAt = new Date(data.leftAt);
    // Handle calledAt: set to Date if provided, or null to unmark
    if (data.calledAt !== undefined) {
      (r as any).calledAt = (data.calledAt === null || data.calledAt === '') ? null : new Date(data.calledAt);
    }
    // Handle cancellationReason if provided
    if (data.cancellationReason) {
      (r as any).cancellationReason = data.cancellationReason;
    }
    await r.save();
    const reservation = r;
    if (!reservation) return res.status(404).json({ error: 'Not found' });
    
    // Send push notification if user becomes #1 in queue
    if (r.queuePosition === 1 && prevQueuePosition !== 1 && r.status === 'pending' && r.mode === 'waitlist') {
      try {
        const restaurant = await Restaurant.findById(r.restaurantId).lean();
        const base = (env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
        
        await sendPushToReservation((r._id as any).toString(), {
          title: '🎉 You\'re Next!',
          body: `You're #1 in line at ${restaurant?.name || 'the restaurant'}! Your table will be ready soon.`,
          icon: '/favicon.png',
          data: {
            reservationId: (r._id as any).toString(),
            restaurantId: r.restaurantId.toString(),
            url: `${base}/#notifications`,
          },
        });
      } catch (pushError) {
        console.error('[PUSH] Failed to send queue position 1 notification:', pushError);
      }
    }
    
    // Emit SSE notification for real-time updates (customer)
    notificationEmitter.notifyReservation((r._id as any).toString(), {
      type: 'reservation_updated',
      reservation: {
        _id: (r._id as any).toString(),
        status: r.status,
        queuePosition: r.queuePosition,
        holdUntil: r.holdUntil,
        holdStatus: r.holdStatus,
        leftAt: r.leftAt,
        seatedAt: r.seatedAt,
        cancellationReason: (r as any).cancellationReason,
      }
    });
    
    // Note: Staff notifications removed - they only get notified for actual table reservations
    
    res.json({ reservation });
  } catch (err) { next(err); }
});

reservationsRouter.delete('/:id', async (req, res, next) => {
  try {
    await Reservation.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// #11 - POST /reservations/:id/cancel - Cancel a reservation
reservationsRouter.post('/:id/cancel', async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    
    if (reservation.status === 'cancelled') {
      return res.json({ success: true, message: 'Already cancelled' });
    }
    
    // Get restaurant details for the email
    const restaurant = await Restaurant.findById(reservation.restaurantId);
    const restaurantName = restaurant?.name || 'the restaurant';
    
    // Update status to cancelled and clear queue position
    reservation.status = 'cancelled';
    reservation.leftAt = new Date();
    reservation.queuePosition = undefined;
    reservation.cancellationReason = 'user_cancelled'; // Track that user cancelled
    await reservation.save();
    
    // Send cancellation confirmation email if customer provided email
    if (reservation.email && isValidEmailForSending(reservation.email)) {
      try {
        await sendEmail({
          to: reservation.email as string,
          subject: `Reservation Cancelled - ${restaurantName}`,
          html: buildEmailTemplate({
            heading: 'Reservation Cancelled',
            intro: `Hi${reservation.name ? ` ${reservation.name}` : ''},`,
            lines: [
              `Your ${reservation.reservationType === 'reserved' ? 'table reservation' : 'waitlist position'} at ${restaurantName} has been cancelled.`,
              'If this was a mistake, please visit the restaurant page to join again.',
              'Thank you for considering us!',
            ],
            footer: 'We hope to see you soon.',
            includeNotificationsLink: true,
          }),
        });
      } catch (emailError) {
        console.error('Failed to send cancellation email:', emailError);
        // Don't fail the cancellation if email fails
      }
    }
    
    // Send SMS notification if customer provided phone
    if (reservation.phone && reservation.contactMethod === 'phone') {
      try {
        await sendNotification({
          to: reservation.phone,
          message: `Your ${reservation.reservationType === 'reserved' ? 'reservation' : 'waitlist position'} at ${restaurantName} has been cancelled. We hope to see you again soon!`
        });
      } catch (smsError) {
        console.error('Failed to send cancellation SMS:', smsError);
        // Don't fail the cancellation if SMS fails
      }
    }
    
    // Emit SSE notification for real-time updates
    notificationEmitter.notifyReservation((reservation._id as any).toString(), {
      type: 'reservation_updated',
      reservation: {
        _id: (reservation._id as any).toString(),
        status: reservation.status,
        queuePosition: reservation.queuePosition,
        leftAt: reservation.leftAt,
        cancellationReason: reservation.cancellationReason,
      }
    });
    
    // Send push notification for user cancellation
    try {
      const base = (env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
      
      await sendPushToReservation((reservation._id as any).toString(), {
        title: 'Reservation Cancelled',
        body: `Your reservation at ${restaurantName} has been cancelled.`,
        icon: '/favicon.png',
        data: {
          reservationId: (reservation._id as any).toString(),
          restaurantId: reservation.restaurantId.toString(),
          url: `${base}/#notifications`,
        },
      });
    } catch (pushError) {
      console.error('[PUSH] Failed to send cancellation push notification:', pushError);
    }
    
    res.json({ success: true, message: 'Reservation cancelled successfully' });
  } catch (err) {
    next(err);
  }
});

reservationsRouter.post('/:id/notify', async (req, res, next) => {
  try {
    const r = await Reservation.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    
    const restaurant = await Restaurant.findById(r.restaurantId);
    const restaurantName = restaurant?.name || 'the restaurant';
    
    // Use custom message/subject from request body if provided, otherwise use default
    const message = req.body?.message || `Your table at ${restaurantName} is ready! Please arrive within 15 minutes to secure your reservation.`;
    const subject = req.body?.subject || 'Your table is ready';
    
    if (r.email && isValidEmailForSending(r.email)) {
      try {
      await sendEmail({
          to: r.email as string,
        subject,
        text: message,
        html: buildEmailTemplate({
          heading: subject,
          intro: `Hi${r.name ? ` ${r.name}` : ''},`,
          lines: [message],
            includeNotificationsLink: true,
        }),
      });
      } catch (emailError) {
        console.error('Failed to send manual notification email:', emailError);
      }
    }
    
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /reservations/:id/assign-table
// Assigns a table to a reservation (auto-select or specific table)
// Updates both reservation and table atomically for data integrity
reservationsRouter.post('/:id/assign-table', async (req, res, next) => {
  try {
    const reservationId = req.params.id;
    const { tableId } = req.body; // Optional: specific table ID chosen by staff
    
    // 1. Load and validate reservation
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    
    // Validate reservation state
    if (reservation.status !== 'pending' && reservation.status !== 'confirmed') {
      return res.status(400).json({ 
        error: 'Reservation must be pending or confirmed',
        currentStatus: reservation.status 
      });
    }
    
    if (reservation.tableId) {
      return res.status(400).json({ error: 'Reservation already has a table assigned' });
    }
    
    let selectedTable: any;
    
    // 2. Select table based on whether tableId was provided
    if (tableId) {
      // Staff specified a particular table - validate and use it
      const requestedTable = await Table.findById(tableId).lean();
      
      if (!requestedTable) {
        return res.status(404).json({ error: 'Requested table not found' });
      }
      
      // Validate table belongs to same restaurant
      if (requestedTable.restaurantId.toString() !== reservation.restaurantId.toString()) {
        return res.status(400).json({ error: 'Table does not belong to this restaurant' });
      }
      
      // Validate table is available
      if (requestedTable.status !== 'available') {
        return res.status(400).json({ 
          error: `Table ${requestedTable.name} is not available (current status: ${requestedTable.status})`
        });
      }
      
      // Validate table has sufficient capacity
      if (requestedTable.capacity < reservation.partySize) {
        return res.status(400).json({ 
          error: `Table ${requestedTable.name} has capacity ${requestedTable.capacity}, but party size is ${reservation.partySize}`
        });
      }
      
      selectedTable = requestedTable;
    } else {
      // Auto-select best available table (respect seating preference)
      const seatingPref = reservation.seatingPreference;
      let tableQuery: any = {
        restaurantId: reservation.restaurantId,
        status: 'available',
        capacity: { $gte: reservation.partySize }
      };
      
      if (seatingPref === 'indoor') {
        tableQuery.location = 'indoor';
      } else if (seatingPref === 'outdoor') {
        tableQuery.location = 'outdoor';
      }
      // For 'no-preference' or undefined, don't filter by location (check both)
      
      const availableTables = await Table.find(tableQuery).sort({ capacity: 1 }).lean(); // Sort by capacity (smallest fit first)
      
      if (availableTables.length === 0) {
        // Check if any tables exist that could fit the party
        const allTables = await Table.find({
          restaurantId: reservation.restaurantId
        }).sort({ capacity: -1 }).lean();
        
        if (allTables.length === 0) {
          return res.status(404).json({ error: 'No tables configured for this restaurant' });
        }
        
        const largestCapacity = allTables[0].capacity;
        if (reservation.partySize > largestCapacity) {
          return res.status(400).json({ 
            error: `Party size (${reservation.partySize}) exceeds largest table capacity (${largestCapacity})`
          });
        }
        
        return res.status(404).json({ 
          error: `No available tables for party of ${reservation.partySize}. All tables are currently occupied.`
        });
      }
      
      selectedTable = availableTables[0]; // Best fit (smallest available)
    }
    
    // 3. Atomic update - both reservation and table
    const now = new Date();
    
    const [updatedReservation, updatedTable] = await Promise.all([
      Reservation.findByIdAndUpdate(
        reservationId,
        {
          $set: {
            status: 'seated',
            tableId: selectedTable._id,
            seatedAt: now,
            queuePosition: null, // Remove from queue
            holdStatus: 'confirmed' // #2 - Mark hold as confirmed when seated
          }
        },
        { new: true }
      ),
      Table.findByIdAndUpdate(
        selectedTable._id,
        {
          $set: {
            status: 'occupied',
            currentReservationId: reservationId
          }
        },
        { new: true }
      )
    ]);
    
    // 4. Verify both updates succeeded
    if (!updatedReservation || !updatedTable) {
      // Rollback if one failed
      if (updatedReservation) {
        await Reservation.findByIdAndUpdate(reservationId, {
          $set: {
            status: reservation.status,
            tableId: null,
            seatedAt: null,
            queuePosition: reservation.queuePosition
          }
        });
      }
      if (updatedTable) {
        await Table.findByIdAndUpdate(selectedTable._id, {
          $set: {
            status: 'available',
            currentReservationId: null
          }
        });
      }
      return res.status(500).json({ error: 'Failed to assign table. Please try again.' });
    }
    
    // 4.5. Recalculate queue positions for remaining customers after seating
    // When a customer is seated, they're removed from the queue, so everyone behind moves up
    const oldQueuePosition = reservation.queuePosition;
    if (typeof oldQueuePosition === 'number' && reservation.mode === 'waitlist') {
      // First, find all affected reservations BEFORE updating their positions
      const affectedReservations = await Reservation.find({
        restaurantId: reservation.restaurantId,
        mode: 'waitlist',
        status: { $in: ['pending', 'confirmed'] },
        queuePosition: { $gt: oldQueuePosition },
        _id: { $ne: reservationId }
      }).lean();
      
      // Decrement queue position for all customers who were behind this one
      await Reservation.updateMany(
        { 
          restaurantId: reservation.restaurantId, 
          mode: 'waitlist', 
          status: { $in: ['pending', 'confirmed'] }, 
          queuePosition: { $gt: oldQueuePosition },
          _id: { $ne: reservationId }
        },
        { $inc: { queuePosition: -1 } }
      );
      
      // Emit SSE updates for all affected reservations so their queue positions update in real-time
      // Fetch updated reservations with new positions
      for (const affected of affectedReservations) {
        const updatedAffectedRes = await Reservation.findById(affected._id).lean();
        if (updatedAffectedRes) {
          notificationEmitter.notifyReservation(updatedAffectedRes._id.toString(), {
            type: 'reservation_updated',
            reservation: {
              _id: updatedAffectedRes._id.toString(),
              status: updatedAffectedRes.status,
              queuePosition: updatedAffectedRes.queuePosition,
              holdUntil: updatedAffectedRes.holdUntil,
              holdStatus: updatedAffectedRes.holdStatus,
            }
          });
        }
      }
    }
    
    // 5. Log the action for audit trail
    console.log({
      action: 'ASSIGN_TABLE',
      reservationId: reservationId,
      tableId: selectedTable._id,
      tableName: selectedTable.name,
      partySize: reservation.partySize,
      tableCapacity: selectedTable.capacity,
      timestamp: now.toISOString(),
      restaurantId: reservation.restaurantId.toString()
    });
    
    // 6. Emit SSE notification for real-time updates (customer)
    notificationEmitter.notifyReservation(reservationId.toString(), {
      type: 'reservation_updated',
      reservation: {
        _id: (updatedReservation._id as any).toString(),
        status: updatedReservation.status,
        queuePosition: updatedReservation.queuePosition,
        holdUntil: updatedReservation.holdUntil,
        holdStatus: updatedReservation.holdStatus,
        tableId: updatedReservation.tableId?.toString(),
        seatedAt: updatedReservation.seatedAt,
      }
    });
    
    // Note: Staff notifications removed - they only get notified for actual table reservations

    // Send push notification - customer seated
    try {
      const restaurant = await Restaurant.findById(reservation.restaurantId).lean();
      const base = (env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
      
      await sendPushToReservation(reservationId.toString(), {
        title: '✅ You\'re Seated!',
        body: `You've been seated at ${restaurant?.name || 'the restaurant'}. Enjoy your meal!`,
        icon: '/favicon.png',
        data: {
          reservationId: reservationId.toString(),
          restaurantId: reservation.restaurantId.toString(),
          url: `${base}/#notifications`,
        },
      });
    } catch (pushError) {
      console.error('[PUSH] Failed to send seated notification:', pushError);
    }
    
    // 7. Return success with complete data
    res.json({
      success: true,
      reservation: updatedReservation,
      table: updatedTable,
      message: `Assigned to ${selectedTable.name}`
    });

    // 7. Notify guest if applicable (queue to table promotion)
    if (reservation.email && isValidEmailForSending(reservation.email)) {
      try {
        const restaurantName = (await Restaurant.findById(reservation.restaurantId).lean())?.name || 'your restaurant';
        const notificationMessage = `Good news! Your table at ${restaurantName} is ready. Please proceed to the host stand to be seated.`;

        await sendEmail({
          to: reservation.email as string,
          subject: 'Your table is ready',
          text: notificationMessage,
          html: buildEmailTemplate({
            heading: 'Your table is ready!',
            intro: `Hi${reservation.name ? ` ${reservation.name}` : ''},`,
            lines: [
              notificationMessage,
              'If you need a few more minutes, just reply to this email to let us know.',
            ],
            includeNotificationsLink: true,
          }),
        });
      } catch (notificationError) {
        console.error('Failed to send queue promotion email:', notificationError);
      }
    }
    
  } catch (err) {
    console.error('Error in assign-table:', err);
    next(err);
  }
});

// POST /reservations/:id/survey - Submit survey feedback for a reservation
const surveySchema = z.object({
  hearAboutUs: z.string().optional(),
  specialRequirements: z.string().optional(),
  improvements: z.string().optional(),
});

reservationsRouter.post('/:id/survey', async (req, res, next) => {
  try {
    const reservationId = req.params.id;
    const data = surveySchema.parse(req.body);
    
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    
    // Update reservation with survey feedback
    (reservation as any).surveyFeedback = {
      hearAboutUs: data.hearAboutUs || undefined,
      specialRequirements: data.specialRequirements || undefined,
      improvements: data.improvements || undefined,
      submittedAt: new Date(),
    };
    
    await reservation.save();
    
    res.json({ 
      success: true, 
      message: 'Survey feedback saved successfully',
      reservation 
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid survey data', details: err.errors });
    }
    next(err);
  }
});



