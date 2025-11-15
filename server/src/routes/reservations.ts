import express from 'express';
import { z } from 'zod';
import { Reservation } from '../models/Reservation';
import { Restaurant } from '../models/Restaurant';
import { Table } from '../models/Table';
import { sendEmail, buildEmailTemplate } from '../services/email';

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
    
    // Parallelize independent queries for better performance
    const [count, availableTables] = await Promise.all([
      data.mode === 'waitlist' 
        ? Reservation.countDocuments({ restaurantId: data.restaurantId, mode: 'waitlist', status: { $in: ['pending', 'confirmed'] } })
        : Promise.resolve(0),
      Table.find({ restaurantId: data.restaurantId, status: 'available' }).lean()
    ]);
    
    // Detect walk-ins (staff-initiated manual seating) by placeholder phone number
    const isWalkIn = data.phone === '0000000000';
    
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

    // Send confirmation notification
    const restaurant = await Restaurant.findById(data.restaurantId);
    if (restaurant) {
      const message = data.mode === 'waitlist'
        ? `Thank you for joining the queue at ${restaurant.name}! You're #${queuePosition} in line. We'll notify you when your table is ready.`
        : `Your reservation request for ${restaurant.name} has been received. We'll contact you shortly to confirm.`;
      
      try {
        if (data.email) {
          const introName = data.name ? `Hi ${data.name},` : 'Hello,';
          
          // Construct frontend URL for cancel link (use CORS_ORIGIN or default to localhost)
          const frontendUrl = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
          const cancelUrl = data.mode === 'waitlist' 
            ? `${frontendUrl}/#cancel-queue?id=${doc._id}`
            : undefined;
          
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
                    'Need to cancel? Click the button below to remove yourself from the queue.',
                  ]
                : [
                    `Thanks for choosing ${restaurant.name}. We're reviewing your reservation request and will confirm shortly.`,
                  ],
              actionText: data.mode === 'waitlist' ? 'Cancel Queue Position' : undefined,
              actionUrl: cancelUrl,
              footer: 'Questions? Reply to this email and we'll get right back to you.',
            }),
          });
        }
      } catch (err) {
        // Log but don't fail reservation if notification fails
        console.error('Failed to send confirmation email:', err);
      }
    }

    res.status(201).json({ reservation: doc });
  } catch (err) { next(err); }
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
      
      if (data.status === 'confirmed') r.confirmedAt = new Date();
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
    await r.save();
    const reservation = r;
    if (!reservation) return res.status(404).json({ error: 'Not found' });
    res.json({ reservation });
  } catch (err) { next(err); }
});

reservationsRouter.delete('/:id', async (req, res, next) => {
  try {
    await Reservation.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
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
            queuePosition: null // Remove from queue
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
    
    // 6. Return success with complete data
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



