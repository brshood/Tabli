import express from 'express';
import { z } from 'zod';
import { Restaurant } from '../models/Restaurant.ts';
import { Rating } from '../models/Rating.ts';
import { Table } from '../models/Table.ts';
import multer from 'multer';
import { getGridFsBucket } from '../db/gridfs.ts';
import { ObjectId } from 'mongodb';
import { requireAuth, requireOwnRestaurant, AuthRequest } from '../middleware/auth.ts';

export const restaurantsRouter = express.Router();

restaurantsRouter.get('/', async (_req, res, next) => {
  try {
    const items = await Restaurant.find().lean();
    const ids = items.map((r: any) => r._id);
    // Aggregate rating summaries for all restaurants in one query
    const summaries = await Rating.aggregate([
      { $match: { restaurantId: { $in: ids } } },
      { $group: { _id: '$restaurantId', count: { $sum: 1 }, avg: { $avg: '$value' } } },
    ]);
    const summaryById = new Map<string, { count: number; avg: number }>();
    summaries.forEach((s: any) => summaryById.set(String(s._id), { count: s.count, avg: s.avg }));
    // Enrich with imageUrl from featuredImageFileId or first active image
    const enriched = await Promise.all(items.map(async (r: any) => {
      let imageFileId = r.featuredImageFileId?.toString();
      if (!imageFileId && Array.isArray(r.mediaRefs)) {
        const activeImg = r.mediaRefs.find((m: any) => m.isActive && m.type === 'image');
        if (activeImg) imageFileId = activeImg.fileId.toString();
      }
      const imageUrl = imageFileId ? `/media/${imageFileId}` : null;
      const s = summaryById.get(String(r._id));
      const ratingSummary = s ? { count: s.count, average: Number(s.avg.toFixed(2)) } : { count: 0, average: 0 };
      const availableTables = await Table.countDocuments({ restaurantId: r._id, status: 'available' });
      return { ...r, imageUrl, ratingSummary, availableTables };
    }));
    res.json({ items: enriched });
  } catch (err) { next(err); }
});

restaurantsRouter.get('/:id', async (req, res, next) => {
  try {
    const item = await Restaurant.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ error: 'Not found' });
    let imageFileId = (item as any).featuredImageFileId?.toString();
    if (!imageFileId && Array.isArray((item as any).mediaRefs)) {
      const activeImg = (item as any).mediaRefs.find((m: any) => m.isActive && m.type === 'image');
      if (activeImg) imageFileId = activeImg.fileId.toString();
    }
    const imageUrl = imageFileId ? `/media/${imageFileId}` : null;
    const availableTables = await Table.countDocuments({ restaurantId: item._id, status: 'available' });
    const s = await Rating.aggregate([
      { $match: { restaurantId: new ObjectId(req.params.id) } },
      { $group: { _id: '$restaurantId', count: { $sum: 1 }, avg: { $avg: '$value' } } },
      { $limit: 1 },
    ]);
    const ratingSummary = s.length ? { count: s[0].count, average: Number(s[0].avg.toFixed(2)) } : { count: 0, average: 0 };
    res.json({ item: { ...item, imageUrl, ratingSummary, availableTables } });
  } catch (err) { next(err); }
});

const updateSchema = z.object({
  name: z.string().min(2).trim().optional(),
  city: z.enum(['Al Ain','Abu Dhabi','Dubai']).optional(),
  cuisine: z.string().min(2).trim().optional(),
  phone: z.string().min(10).trim().optional(),
  email: z.string().email().trim().optional(),
  description: z.string().trim().optional(),
  address: z.string().min(5).trim().optional(),
  openingHours: z.string().optional(),
  closingHours: z.string().optional(),
  priceRange: z.string().optional(),
});

restaurantsRouter.put('/:id', requireAuth, requireOwnRestaurant, async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const item = await Restaurant.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, upsert: false });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ item });
  } catch (err) { next(err); }
});

// File validation
const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed.'));
    }
    // Sanitize filename
    file.originalname = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 100);
    cb(null, true);
  },
});

restaurantsRouter.post('/:id/media', requireAuth, requireOwnRestaurant, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' });
    const r = await Restaurant.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Restaurant not found' });
    const type = req.file.mimetype.includes('pdf') ? 'pdf' : 'image';
    const bucket = getGridFsBucket();
    const stream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
      metadata: { restaurantId: r._id.toString(), type },
    });
    stream.end(req.file.buffer);
    stream.on('finish', async (file) => {
      r.mediaRefs = r.mediaRefs || [];
      r.mediaRefs.push({ 
        fileId: file._id as ObjectId, 
        type: type as any, 
        filename: file.filename, 
        contentType: file.contentType || 'application/octet-stream',
        category: 'other' as any,
        version: 1,
        uploadedAt: new Date(),
        isActive: true,
      });
      await r.save();
      res.json({ id: file._id, filename: file.filename, contentType: file.contentType, type });
    });
    stream.on('error', (err) => next(err));
  } catch (err) { next(err); }
});

// Set featured image for discover/profile cards
const featureSchema = z.object({ fileId: z.string().min(10) });
restaurantsRouter.post('/:id/feature-image', requireAuth, requireOwnRestaurant, async (req: AuthRequest, res, next) => {
  try {
    const { fileId } = featureSchema.parse(req.body);
    const r = await Restaurant.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Restaurant not found' });
    const hasImage = (r.mediaRefs || []).some(m => m.fileId.toString() === fileId && m.type === 'image');
    if (!hasImage) return res.status(400).json({ error: 'Image not found in restaurant media' });
    (r as any).featuredImageFileId = new ObjectId(fileId);
    await r.save();
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Ratings endpoints
const ratingCreateSchema = z.object({ 
  value: z.number().min(1).max(5), 
  comment: z.string().max(500).optional(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().min(6).max(30),
});
restaurantsRouter.post('/:id/ratings', async (req, res, next) => {
  try {
    const { value, comment, name, email, phone } = ratingCreateSchema.parse(req.body);
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    const existing = await Rating.findOne({ restaurantId: restaurant._id, $or: [{ email }, { phone }] });
    if (existing) {
      existing.value = value;
      existing.comment = comment;
      existing.name = name;
      existing.email = email;
      existing.phone = phone;
      await existing.save();
      return res.json({ success: true, updated: true });
    }
    const doc = await Rating.create({ restaurantId: restaurant._id, value, comment, name, email, phone });
    res.json({ success: true, rating: { id: doc._id, value: doc.value, comment: doc.comment, createdAt: doc.createdAt } });
  } catch (err) { next(err); }
});

restaurantsRouter.get('/:id/ratings', async (req, res, next) => {
  try {
    const list = await Rating.find({ restaurantId: new ObjectId(req.params.id) })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ items: list });
  } catch (err) { next(err); }
});



