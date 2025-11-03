import express from 'express';
import { z } from 'zod';
import { Reservation } from '../models/Reservation.ts';
import { Restaurant } from '../models/Restaurant.ts';
import { sendEmail } from '../services/email.ts';
import { sendSMS } from '../services/sms.ts';

export const reservationsRouter = express.Router();

const createSchema = z.object({
  restaurantId: z.string(),
  mode: z.enum(['reserve', 'waitlist']),
  name: z.string().min(1).max(100).optional(),
  partySize: z.number().min(1).max(20),
  contactMethod: z.enum(['phone', 'email']),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

reservationsRouter.post('/', async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    let queuePosition: number | undefined = undefined;
    if (data.mode === 'waitlist') {
      const count = await Reservation.countDocuments({ restaurantId: data.restaurantId, mode: 'waitlist', status: { $in: ['pending', 'confirmed'] } });
      queuePosition = count + 1;
    }
    const doc = await Reservation.create({
      restaurantId: data.restaurantId,
      name: data.name,
      mode: data.mode,
      partySize: data.partySize,
      contactMethod: data.contactMethod,
      phone: data.contactMethod === 'phone' ? data.phone : undefined,
      email: data.contactMethod === 'email' ? data.email : undefined,
      status: 'pending',
      queuePosition,
    });

    // Send confirmation notification
    const restaurant = await Restaurant.findById(data.restaurantId);
    if (restaurant) {
      const message = data.mode === 'waitlist'
        ? `Thank you for joining the queue at ${restaurant.name}! You're #${queuePosition} in line. We'll notify you when your table is ready.`
        : `Your reservation request for ${restaurant.name} has been received. We'll contact you shortly to confirm.`;
      
      try {
        if (data.contactMethod === 'phone' && data.phone) {
          await sendSMS({ to: data.phone, message });
        } else if (data.contactMethod === 'email' && data.email) {
          await sendEmail({ to: data.email, subject: `Reservation at ${restaurant.name}`, text: message });
        }
      } catch (err) {
        // Log but don't fail reservation if notification fails
        console.error('Failed to send confirmation notification:', err);
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
    res.json({ items });
  } catch (err) { next(err); }
});

const patchSchema = z.object({
  status: z.enum(['pending','confirmed','seated','cancelled','no_show']).optional(),
  queuePosition: z.number().optional(),
  tableId: z.string().optional(),
});

reservationsRouter.patch('/:id', async (req, res, next) => {
  try {
    const data = patchSchema.parse(req.body);
    const r = await Reservation.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    const prevStatus = r.status;
    if (data.status && data.status !== prevStatus) {
      if (data.status === 'confirmed') r.confirmedAt = new Date();
      if (data.status === 'seated') r.seatedAt = new Date();
      if (data.status === 'cancelled' || data.status === 'no_show') r.leftAt = new Date();
      r.status = data.status;
    }
    if (typeof data.queuePosition === 'number') r.queuePosition = data.queuePosition;
    if (data.tableId) (r as any).tableId = data.tableId;
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
    const message = `Your table at ${restaurantName} is ready! Please arrive within 10 minutes to secure your reservation.`;
    
    if (r.contactMethod === 'phone' && r.phone) {
      await sendSMS({ to: r.phone, message });
    } else if (r.contactMethod === 'email' && r.email) {
      await sendEmail({ to: r.email, subject: 'Your table is ready', text: message });
    }
    
    res.json({ success: true });
  } catch (err) { next(err); }
});



