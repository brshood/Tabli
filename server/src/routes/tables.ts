import express from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Table } from '../models/Table';
import { Reservation } from '../models/Reservation';
import { Restaurant } from '../models/Restaurant';
import { sendEmail, buildEmailTemplate } from '../services/email';
import { env } from '../config/env';

export const tablesRouter = express.Router();

tablesRouter.get('/restaurants/:id/tables', async (req, res, next) => {
  try {
    const items = await Table.find({ restaurantId: req.params.id }).lean();
    res.json({ items });
  } catch (err) { next(err); }
});

const createSchema = z.object({ name: z.string(), capacity: z.number().min(1) });

tablesRouter.post('/restaurants/:id/tables', async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const table = await Table.create({ restaurantId: req.params.id, name: data.name, capacity: data.capacity });
    res.status(201).json({ table });
  } catch (err) { next(err); }
});

const patchSchema = z.object({ status: z.enum(['available','occupied','cleaning']).optional(), capacity: z.number().min(1).optional(), name: z.string().optional() });

tablesRouter.patch('/tables/:id', async (req, res, next) => {
  try {
    const data = patchSchema.parse(req.body);
    const table = await Table.findByIdAndUpdate(req.params.id, { $set: data }, { new: true });
    if (!table) return res.status(404).json({ error: 'Not found' });
    res.json({ table });
  } catch (err) { next(err); }
});

tablesRouter.post('/tables/:id/seat', async (req, res, next) => {
  try {
    const { reservationId } = req.body as any;
    const table = await Table.findByIdAndUpdate(req.params.id, { $set: { status: 'occupied', currentReservationId: reservationId } }, { new: true });
    if (!table) return res.status(404).json({ error: 'Not found' });
    res.json({ table });
  } catch (err) { next(err); }
});

// POST /tables/:id/checkout
// Checks out a table and updates the linked reservation
// Calculates and logs dwell time for analytics
tablesRouter.post('/tables/:id/checkout', async (req, res, next) => {
  try {
    const tableId = req.params.id;
    
    // 1. Load and validate table
    const table = await Table.findById(tableId);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    if (table.status !== 'occupied') {
      return res.status(400).json({ 
        error: 'Table is not currently occupied',
        currentStatus: table.status 
      });
    }
    
    if (!table.currentReservationId) {
      return res.status(500).json({ 
        error: 'Data inconsistency: Table is occupied but has no linked reservation' 
      });
    }
    
    // 2. Load linked reservation
    const reservation = await Reservation.findById(table.currentReservationId);
    if (!reservation) {
      // Table is occupied but reservation doesn't exist - fix the inconsistency
      await Table.findByIdAndUpdate(tableId, {
        $set: { status: 'available', currentReservationId: null }
      });
      return res.status(500).json({ 
        error: 'Data inconsistency: Linked reservation not found. Table has been freed.' 
      });
    }
    
    // TypeScript now knows reservation is not null
    const reservationId = (reservation._id as mongoose.Types.ObjectId).toString();
    
    // 3. Calculate metrics for logging
    const now = new Date();
    let dwellTimeMinutes = 0;
    if (reservation.seatedAt) {
      const dwellMs = now.getTime() - new Date(reservation.seatedAt).getTime();
      dwellTimeMinutes = Math.round(dwellMs / 60000);
    }
    
    // 4. Atomic update - both table and reservation
    const [updatedTable, updatedReservation] = await Promise.all([
      Table.findByIdAndUpdate(
        tableId,
        {
          $set: {
            status: 'available',
            currentReservationId: null
          }
        },
        { new: true }
      ),
      Reservation.findByIdAndUpdate(
        table.currentReservationId,
        {
          $set: {
            leftAt: now
            // Keep status as 'seated' for analytics
          }
        },
        { new: true }
      )
    ]);
    
    // 5. Verify both updates succeeded
    if (!updatedTable || !updatedReservation) {
      return res.status(500).json({ error: 'Failed to checkout table. Please try again.' });
    }
    
    // 6. Log the action for audit trail and monitoring
    console.log({
      action: 'CHECKOUT_TABLE',
      tableId: tableId,
      tableName: table.name,
      reservationId: reservationId,
      customerName: reservation.name,
      partySize: reservation.partySize,
      dwellTimeMinutes: dwellTimeMinutes,
      seatedAt: reservation.seatedAt?.toISOString(),
      leftAt: now.toISOString(),
      timestamp: now.toISOString(),
      restaurantId: table.restaurantId.toString()
    });
    
    // 7. Send thank-you email with rating link if applicable
    if (reservation.email) {
      try {
        const restaurant = await Restaurant.findById(reservation.restaurantId).lean();
        const base = (env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
        const ratingLink = `${base}/restaurant/${reservation.restaurantId.toString()}?qr=true`;
        const thankYouMessage = `Thank you for dining with ${restaurant?.name || 'us'}! Share your experience: ${ratingLink}`;
        await sendEmail({
          to: reservation.email,
          subject: `Thank you for visiting ${restaurant?.name || 'us'}`,
          text: thankYouMessage,
          html: buildEmailTemplate({
            heading: 'Thank you for dining with us!',
            intro: reservation.name ? `Hi ${reservation.name},` : 'Hello,',
            lines: [
              restaurant?.name
                ? `We hope you enjoyed your time at ${restaurant.name}.`
                : 'We hope you enjoyed your dining experience.',
              'We’d love to hear how everything went—share your thoughts with us!',
            ],
            actionText: 'Leave a quick rating',
            actionUrl: ratingLink,
          }),
        });
      } catch (notificationError) {
        console.error('Failed to send thank-you email:', notificationError);
      }
    }

    // 8. Return success with complete data
    res.json({
      success: true,
      table: updatedTable,
      reservation: updatedReservation,
      dwellTimeMinutes: dwellTimeMinutes,
      message: `${table.name} is now available`
    });
    
  } catch (err) {
    console.error('Error in checkout:', err);
    next(err);
  }
});

tablesRouter.delete('/tables/:id', async (req, res, next) => {
  try {
    await Table.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});



