import express from 'express';
import { Reservation } from '../models/Reservation';

export const maintenanceRouter = express.Router();

// POST /maintenance/zero/:restaurantId
// Sets all pending/confirmed waitlist reservations to cancelled and re-numbers nothing (queue cleared)
maintenanceRouter.post('/zero/:restaurantId', async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    await Reservation.updateMany(
      { restaurantId, mode: 'waitlist', status: { $in: ['pending', 'confirmed'] } },
      { $set: { status: 'cancelled', leftAt: new Date() } }
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});


