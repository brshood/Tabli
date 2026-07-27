import express from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Table } from '../models/Table';
import { Reservation } from '../models/Reservation';
import { Restaurant } from '../models/Restaurant';
import { sendEmail, buildEmailTemplate, isValidEmailForSending } from '../services/email';
import { sendSmsViaEand, normalizeMsisdn } from '../services/eandSmsClient';
import { getCheckoutMessage } from '../services/smsMessages';
import { env } from '../config/env';
import { notificationEmitter } from '../services/notificationEmitter';

export const tablesRouter = express.Router();

tablesRouter.get('/restaurants/:id/tables', async (req, res, next) => {
  try {
    const items = await Table.find({ restaurantId: req.params.id }).lean();
    res.json({ items });
  } catch (err) { next(err); }
});

// GET /tables/availability/:restaurantId
// Customer-facing section availability: staff toggles only (indoorFull/outdoorFull).
// partySize query is ignored for availability booleans (kept for API compatibility).
tablesRouter.get('/tables/availability/:restaurantId', async (req, res, next) => {
  try {
    const restaurantId = req.params.restaurantId;

    const restaurant = await Restaurant.findById(restaurantId).select('indoorFull outdoorFull').lean();
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const indoorFull = (restaurant as any)?.indoorFull === true;
    const outdoorFull = (restaurant as any)?.outdoorFull === true;

    const indoorAvailable = !indoorFull;
    const outdoorAvailable = !outdoorFull;
    const noPreferenceAvailable = indoorAvailable || outdoorAvailable;

    res.json({
      indoor: {
        available: indoorAvailable,
        count: indoorAvailable ? 1 : 0,
      },
      outdoor: {
        available: outdoorAvailable,
        count: outdoorAvailable ? 1 : 0,
      },
      noPreference: {
        available: noPreferenceAvailable,
      },
    });
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({ 
  name: z.string(), 
  capacity: z.number().min(1),
  location: z.enum(['indoor', 'outdoor']).optional().default('indoor'),
});

tablesRouter.post('/restaurants/:id/tables', async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const table = await Table.create({ 
      restaurantId: req.params.id, 
      name: data.name, 
      capacity: data.capacity,
      location: data.location,
    });
    res.status(201).json({ table });
  } catch (err) { next(err); }
});

const patchSchema = z.object({ 
  status: z.enum(['available','occupied','cleaning']).optional(), 
  capacity: z.number().min(1).optional(), 
  name: z.string().optional(),
  location: z.enum(['indoor', 'outdoor']).optional(),
});

tablesRouter.patch('/tables/:id', async (req, res, next) => {
  try {
    const data = patchSchema.parse(req.body);
    const table = await Table.findByIdAndUpdate(req.params.id, { $set: data }, { new: true });
    if (!table) return res.status(404).json({ error: 'Not found' });
    res.json({ table });
  } catch (err) { next(err); }
});

// Seating a guest goes through POST /reservations/:id/assign-table, which marks
// the table occupied *and* moves the reservation to 'seated' with a tableId. An
// endpoint that only flips the table left the two out of sync, so it is gone.

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
    
    // 7. Send thank-you email with rating link if applicable (skip for walk-ins)
    if (reservation.email && isValidEmailForSending(reservation.email)) {
      try {
        const restaurant = await Restaurant.findById(reservation.restaurantId).lean();
        const base = (env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
        const ratingLink = `${base}/#restaurant-profile?id=${reservation.restaurantId.toString()}`;
        const thankYouMessage = `Thank you for dining with ${restaurant?.name || 'us'}! Share your experience: ${ratingLink}`;
        await sendEmail({
          to: reservation.email as string,
          subject: `Thank you for visiting ${restaurant?.name || 'us'}`,
          text: thankYouMessage,
          html: buildEmailTemplate({
            heading: 'Thank you for dining with us!',
            intro: reservation.name ? `Hi ${reservation.name},` : 'Hello,',
            lines: [
              restaurant?.name
                ? `We hope you enjoyed your time at ${restaurant.name}.`
                : 'We hope you enjoyed your dining experience.',
              "We'd love to hear how everything went - share your thoughts with us!",
            ],
            actionText: 'Leave a quick rating',
            actionUrl: ratingLink,
            includeNotificationsLink: true,
          }),
        });
      } catch (notificationError) {
        console.error('Failed to send thank-you email:', notificationError);
      }
    }

    // 7.5. Send SMS notification for checkout (skip for walk-ins)
    if (reservation.phone && reservation.phone !== '0000000000') {
      // Fire and forget - don't block checkout
      const restaurant = await Restaurant.findById(reservation.restaurantId).lean();
      sendSmsViaEand({
        to: reservation.phone,
        text: getCheckoutMessage({ restaurantName: restaurant?.name }),
        category: 'otp',
      }).catch((smsError) => {
        console.error('[CHECKOUT] Failed to send SMS notification:', {
          error: smsError instanceof Error ? smsError.message : smsError,
          phone: reservation.phone,
          reservationId: reservationId,
          hasAccessToken: !!process.env.EAND_ACCESS_TOKEN,
          hasSenderId: !!process.env.EAND_SENDER_ID,
        });
        // Don't fail checkout if SMS fails
      });
    }

    // 8. Emit SSE notification for real-time checkout update (customer)
    notificationEmitter.notifyReservation(reservationId.toString(), {
      type: 'reservation_updated',
      reservation: {
        _id: (updatedReservation._id as any).toString(),
        status: updatedReservation.status,
        leftAt: updatedReservation.leftAt,
        seatedAt: updatedReservation.seatedAt,
      }
    });

    // Note: Staff notifications removed - they only get notified for actual table reservations

    // 9. Return success with complete data
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

// POST /tables/checkout-by-reservation/:reservationId
// Alternative checkout endpoint using reservation ID instead of table ID
// Useful when table was deleted but reservation still exists
tablesRouter.post('/tables/checkout-by-reservation/:reservationId', async (req, res, next) => {
  try {
    const reservationId = req.params.reservationId;
    
    // 1. Load the reservation
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    
    if (reservation.status !== 'seated' || reservation.leftAt) {
      return res.status(400).json({ 
        error: 'Reservation is not currently seated',
        currentStatus: reservation.status 
      });
    }
    
    // 2. Find the table using currentReservationId
    const table = await Table.findOne({ 
      currentReservationId: reservationId,
      restaurantId: reservation.restaurantId
    });
    
    // 3. Calculate metrics (do this before checking for table so we can use it even if table is missing)
    const now = new Date();
    let dwellTimeMinutes = 0;
    if (reservation.seatedAt) {
      const dwellMs = now.getTime() - new Date(reservation.seatedAt).getTime();
      dwellTimeMinutes = Math.round(dwellMs / 60000);
    }
    
    if (!table) {
      // Reservation exists but no table is linked - mark reservation as checked out
      const updatedReservation = await Reservation.findByIdAndUpdate(reservationId, {
        $set: { leftAt: now }
      }, { new: true });
      
      return res.json({ 
        success: true,
        message: 'Reservation checked out. No table was linked.',
        reservation: updatedReservation,
        table: null,
        dwellTimeMinutes: dwellTimeMinutes // Use calculated dwell time instead of 0
      });
    }
    
    // 4. Atomic update - both table and reservation
    const [updatedTable, updatedReservation] = await Promise.all([
      Table.findByIdAndUpdate(
        table._id,
        {
          $set: {
            status: 'available',
            currentReservationId: null
          }
        },
        { new: true }
      ),
      Reservation.findByIdAndUpdate(
        reservationId,
        {
          $set: {
            leftAt: now
          }
        },
        { new: true }
      )
    ]);
    
    // 5. Verify both updates succeeded
    if (!updatedTable || !updatedReservation) {
      return res.status(500).json({ error: 'Failed to checkout table. Please try again.' });
    }
    
    // 6. Log the action
    console.log({
      action: 'CHECKOUT_TABLE_BY_RESERVATION',
      tableId: (table._id as any).toString(),
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
    
    // 7. Send thank-you email with rating link if applicable (skip for walk-ins)
    if (reservation.email && isValidEmailForSending(reservation.email)) {
      try {
        const restaurant = await Restaurant.findById(reservation.restaurantId).lean();
        const base = (env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
        const ratingLink = `${base}/#restaurant-profile?id=${reservation.restaurantId.toString()}`;
        const thankYouMessage = `Thank you for dining with ${restaurant?.name || 'us'}! Share your experience: ${ratingLink}`;
        await sendEmail({
          to: reservation.email as string,
          subject: `Thank you for visiting ${restaurant?.name || 'us'}`,
          text: thankYouMessage,
          html: buildEmailTemplate({
            heading: 'Thank you for dining with us!',
            intro: reservation.name ? `Hi ${reservation.name},` : 'Hello,',
            lines: [
              restaurant?.name
                ? `We hope you enjoyed your time at ${restaurant.name}.`
                : 'We hope you enjoyed your dining experience.',
              "We'd love to hear how everything went - share your thoughts with us!",
            ],
            actionText: 'Leave a quick rating',
            actionUrl: ratingLink,
            includeNotificationsLink: true,
          }),
        });
      } catch (notificationError) {
        console.error('Failed to send thank-you email:', notificationError);
      }
    }

    // 7.5. Send SMS notification for checkout (skip for walk-ins)
    if (reservation.phone && reservation.phone !== '0000000000') {
      // Fire and forget - don't block checkout
      const restaurant = await Restaurant.findById(reservation.restaurantId).lean();
      sendSmsViaEand({
        to: reservation.phone,
        text: getCheckoutMessage({ restaurantName: restaurant?.name }),
        category: 'otp',
      }).catch((smsError) => {
        console.error('[CHECKOUT] Failed to send SMS notification:', {
          error: smsError instanceof Error ? smsError.message : smsError,
          phone: reservation.phone,
          reservationId: reservationId,
          hasAccessToken: !!process.env.EAND_ACCESS_TOKEN,
          hasSenderId: !!process.env.EAND_SENDER_ID,
        });
        // Don't fail checkout if SMS fails
      });
    }
    
    // 8. Emit SSE notification
    notificationEmitter.notifyReservation(reservationId.toString(), {
      type: 'reservation_updated',
      reservation: {
        _id: (updatedReservation._id as any).toString(),
        status: updatedReservation.status,
        leftAt: updatedReservation.leftAt,
        seatedAt: updatedReservation.seatedAt,
      }
    });
    
    // 9. Return success
    res.json({
      success: true,
      table: updatedTable,
      reservation: updatedReservation,
      dwellTimeMinutes: dwellTimeMinutes,
      message: `${table.name} is now available`
    });
    
  } catch (err) {
    console.error('Error in checkout by reservation:', err);
    next(err);
  }
});

tablesRouter.delete('/tables/:id', async (req, res, next) => {
  try {
    await Table.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});



