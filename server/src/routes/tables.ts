import express from 'express';
import { z } from 'zod';
import { Table } from '../models/Table.ts';

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

tablesRouter.post('/tables/:id/checkout', async (req, res, next) => {
  try {
    const table = await Table.findByIdAndUpdate(req.params.id, { $set: { status: 'available', currentReservationId: undefined } }, { new: true });
    if (!table) return res.status(404).json({ error: 'Not found' });
    res.json({ table });
  } catch (err) { next(err); }
});



