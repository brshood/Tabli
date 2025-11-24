import express from 'express';
import { z } from 'zod';
import { Reservation } from '../models/Reservation';
import { Restaurant } from '../models/Restaurant';
import { Table } from '../models/Table';
import { sendEmail, buildEmailTemplate } from '../services/email';
import { sendNotification } from '../services/sms';
import { notificationEmitter } from '../services/notificationEmitter';

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
      
      // Check by email or phone depending on contact method
      if (data.email) {
        duplicateQuery.email = data.email;
      } else if (data.phone) {
        duplicateQuery.phone = data.phone;
      }
      
      const existingReservation = await Reservation.findOne(duplicateQuery);
      if (existingReservation) {
        return res.status(409).json({ 
          error: 'You already have an active reservation at this restaurant' 
        });
      }
    }
    
    // Parallelize independent queries for better performance
    const [count, availableTables] = await Promise.all([
      data.mode === 'waitlist' 
        ? Reservation.countDocuments({ restaurantId: data.restaurantId, mode: 'waitlist', status: { $in: ['pending', 'confirmed'] } })
        : Promise.resolve(0),
      Table.find({ restaurantId: data.restaurantId, status: 'available' }).lean()
    ]);
    
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
      const capacities = availableTables.map(t => t.capacity);
      const maxCapacity = capacities.length ? Math.max(...capacities) : 0;
      
      if (data.mode === 'reserve' && data.partySize <= maxCapacity) {
        // Table was available when they reserved
        reservationType = 'reserved';
      } else {
        // No table available or mode is 'waitlist'
        reservationType = 'waitlist';
      }
    }
    
    // Only assign queue position for waitlist mode
    const queuePosition = (data.mode === 'waitlist') ? count + 1 : undefined;

    const doc = await Reservation.create({
      restaurantId: data.restaurantId,
      name: data.name,
      mode: data.mode,
      partySize: data.partySize,
      contactMethod: data.contactMethod,
      phone: data.contactMethod === 'phone' ? data.phone : undefined,
      email: data.contactMethod === 'email' ? data.email : undefined,
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
      const message = data.mode === 'waitlist'
        ? `Thank you for joining the queue at ${restaurant.name}! You're #${queuePosition} in line. We'll notify you when your table is ready.`
        : `Your reservation request for ${restaurant.name} has been received. We'll contact you shortly to confirm.`;
      
      try {
        if (data.email) {
          const introName = data.name ? `Hi ${data.name},` : 'Hello,';
          
          // #11 - Construct frontend URL for cancel link
          const frontendUrl = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
          const cancelUrl = `${frontendUrl}/#cancel-reservation?id=${doc._id}`;
          
          await sendEmail({
            to: data.email,
            subject: `Reservation at ${restaurant.name}`,
            text: message,
            html: buildEmailTemplate({
              heading: data.mode === 'waitlist'
                ? `You're on the waitlist at ${restaurant.name}`
                : `We've received your reservation`,
              intro: introName,
              lines: data.mode === 'waitlist'
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
            }),
          });
          
          // #3 - Mark email as sent on success
          doc.emailSent = true;
          await doc.save();
        }
      } catch (err) {
        // Log but don't fail reservation if notification fails
        console.error('Failed to send confirmation email:', err);
        // emailSent remains false if email failed
      }
      
      // #1 - Send SMS notification if phone contact method
      if (data.contactMethod === 'phone' && data.phone) {
        try {
          const smsMessage = data.mode === 'reserve'
            ? `Hello! Your table at ${restaurant.name} is now reserved and will be held for you for the next 10 minutes. Please arrive promptly. We look forward to seeing you soon!`
            : `Hello! You've been added to the waitlist at ${restaurant.name}. We'll let you know as soon as your table is ready. Thank you for your patience!`;
          
          await sendNotification({
            to: data.phone,
            message: smsMessage
          });
        } catch (smsError) {
          console.error('Failed to send SMS notification:', smsError);
          // Don't fail reservation if SMS fails
        }
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
      const start = new Date(date);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filter.requestedAt = { $gte: start, $lt: end };
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
        
        // Send email notification about hold
        if (r.email) {
          try {
            const restaurant = await Restaurant.findById(r.restaurantId).lean();
            const holdTime = holdUntil.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            
            await sendEmail({
              to: r.email,
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
                footer: 'See you soon!'
              })
            });
          } catch (emailError) {
            console.error('Failed to send hold notification email:', emailError);
          }
        }
      }
      if (data.status === 'cancelled' || data.status === 'no_show') r.leftAt = new Date();
      r.status = data.status;
    }
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
    
    // Emit SSE notification for real-time updates
    notificationEmitter.notifyReservation(r._id.toString(), {
      type: 'reservation_updated',
      reservation: {
        _id: r._id.toString(),
        status: r.status,
        queuePosition: r.queuePosition,
        holdUntil: r.holdUntil,
        holdStatus: r.holdStatus,
        leftAt: r.leftAt,
        seatedAt: r.seatedAt,
        cancellationReason: (r as any).cancellationReason,
      }
    });
    
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
    if (reservation.email) {
      try {
        await sendEmail({
          to: reservation.email,
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
    notificationEmitter.notifyReservation(reservation._id.toString(), {
      type: 'reservation_updated',
      reservation: {
        _id: reservation._id.toString(),
        status: reservation.status,
        queuePosition: reservation.queuePosition,
        leftAt: reservation.leftAt,
        cancellationReason: reservation.cancellationReason,
      }
    });
    
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
    const message = req.body?.message || `Your table at ${restaurantName} is ready! Please arrive within 10 minutes to secure your reservation.`;
    const subject = req.body?.subject || 'Your table is ready';
    
    if (r.email) {
      await sendEmail({
        to: r.email,
        subject,
        text: message,
        html: buildEmailTemplate({
          heading: subject,
          intro: `Hi${r.name ? ` ${r.name}` : ''},`,
          lines: [message],
        }),
      });
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
      // Auto-select best available table
      const availableTables = await Table.find({
        restaurantId: reservation.restaurantId,
        status: 'available',
        capacity: { $gte: reservation.partySize }
      }).sort({ capacity: 1 }).lean(); // Sort by capacity (smallest fit first)
      
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
    
    // 6. Emit SSE notification for real-time updates
    notificationEmitter.notifyReservation(reservationId.toString(), {
      type: 'reservation_updated',
      reservation: {
        _id: updatedReservation._id.toString(),
        status: updatedReservation.status,
        queuePosition: updatedReservation.queuePosition,
        holdUntil: updatedReservation.holdUntil,
        holdStatus: updatedReservation.holdStatus,
        tableId: updatedReservation.tableId?.toString(),
        seatedAt: updatedReservation.seatedAt,
      }
    });
    
    // 7. Return success with complete data
    res.json({
      success: true,
      reservation: updatedReservation,
      table: updatedTable,
      message: `Assigned to ${selectedTable.name}`
    });

    // 7. Notify guest if applicable (queue to table promotion)
    if (reservation.email) {
      try {
        const restaurantName = (await Restaurant.findById(reservation.restaurantId).lean())?.name || 'your restaurant';
        const notificationMessage = `Good news! Your table at ${restaurantName} is ready. Please proceed to the host stand to be seated.`;

        await sendEmail({
          to: reservation.email,
          subject: 'Your table is ready',
          text: notificationMessage,
          html: buildEmailTemplate({
            heading: 'Your table is ready!',
            intro: `Hi${reservation.name ? ` ${reservation.name}` : ''},`,
            lines: [
              notificationMessage,
              'If you need a few more minutes, just reply to this email to let us know.',
            ],
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



