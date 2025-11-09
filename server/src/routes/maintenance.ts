import express from 'express';
import { Reservation } from '../models/Reservation';

export const maintenanceRouter = express.Router();

// POST /maintenance/zero/:restaurantId
// Sets all pending/confirmed reservations to cancelled (queue cleared)
// This clears all reservations that appear in the waitlist, regardless of mode
maintenanceRouter.post('/zero/:restaurantId', async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const result = await Reservation.updateMany(
      { 
        restaurantId, 
        status: { $in: ['pending', 'confirmed'] },
        // Only clear reservations that don't have a table assigned (they're in the queue)
        // tableId: null matches both null and undefined in MongoDB
        tableId: null
      },
      { $set: { status: 'cancelled', leftAt: new Date() } }
    );
    res.json({ success: true, count: result.modifiedCount });
  } catch (err) { next(err); }
});


