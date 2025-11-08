import express from 'express';
import { z } from 'zod';
import { Restaurant } from '../models/Restaurant';
import { Rating } from '../models/Rating';
import { Table } from '../models/Table';
import multer from 'multer';
import { getGridFsBucket } from '../db/gridfs';
import { ObjectId } from 'mongodb';
import { requireAuth, requireOwnRestaurant, AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';

export const restaurantsRouter = express.Router();

restaurantsRouter.get('/', async (_req, res, next) => {
  try {
    const items = await Restaurant.find().lean();
    const ids = items.map((r: any) => r._id);
    
    // Batch all queries in parallel for better performance
    const [summaries, tableCounts] = await Promise.all([
      Rating.aggregate([
        { $match: { restaurantId: { $in: ids } } },
        { $group: { _id: '$restaurantId', count: { $sum: 1 }, avg: { $avg: '$value' } } },
      ]),
      Table.aggregate([
        { $match: { restaurantId: { $in: ids }, status: 'available' } },
        { $group: { _id: '$restaurantId', count: { $sum: 1 } } },
      ])
    ]);
    
    const summaryById = new Map<string, { count: number; avg: number }>();
    summaries.forEach((s: any) => summaryById.set(String(s._id), { count: s.count, avg: s.avg }));
    
    const tableCountById = new Map<string, number>();
    tableCounts.forEach((t: any) => tableCountById.set(String(t._id), t.count));
    
    // Enrich with imageUrl from featuredImageFileId or first active image (synchronous now)
    const enriched = items.map((r: any) => {
      let imageFileId = r.featuredImageFileId?.toString();
      if (!imageFileId && Array.isArray(r.mediaRefs)) {
        const activeImg = r.mediaRefs.find((m: any) => m.isActive && m.type === 'image');
        if (activeImg) imageFileId = activeImg.fileId.toString();
      }
      const imageUrl = imageFileId ? `/media/${imageFileId}` : null;
      const s = summaryById.get(String(r._id));
      const ratingSummary = s ? { count: s.count, average: Number(s.avg.toFixed(2)) } : { count: 0, average: 0 };
      const availableTables = tableCountById.get(String(r._id)) || 0;
      return { ...r, imageUrl, ratingSummary, availableTables };
    });
    
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
    
    // Parallelize independent queries for better performance
    const [availableTables, s] = await Promise.all([
      Table.countDocuments({ restaurantId: item._id, status: 'available' }),
      Rating.aggregate([
        { $match: { restaurantId: new ObjectId(req.params.id) } },
        { $group: { _id: '$restaurantId', count: { $sum: 1 }, avg: { $avg: '$value' } } },
        { $limit: 1 },
      ])
    ]);
    
    const ratingSummary = s.length ? { count: s[0].count, average: Number(s[0].avg.toFixed(2)) } : { count: 0, average: 0 };
    res.json({ item: { ...item, imageUrl, ratingSummary, availableTables } });
  } catch (err) { next(err); }
});

const menuItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().optional(),
  price: z.string().min(1),
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
  menu: z.array(menuItemSchema).optional(),
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

const profilePictureMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const profilePictureUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!profilePictureMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
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
      metadata: { restaurantId: (r._id as any).toString(), type },
    });
    stream.end(req.file.buffer);
    stream.on('finish', async (file: any) => {
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

restaurantsRouter.post('/:id/profile-picture', requireAuth, requireOwnRestaurant, profilePictureUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file is required' });

    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    restaurant.mediaRefs = restaurant.mediaRefs || [];

    const previousProfilePictures = restaurant.mediaRefs.filter(doc => doc.category === 'profile-picture');
    const nextVersion = previousProfilePictures.length
      ? Math.max(...previousProfilePictures.map(doc => doc.version || 1)) + 1
      : 1;

    previousProfilePictures.forEach(doc => { doc.isActive = false; });

    const bucket = getGridFsBucket();
    const stream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
      metadata: {
        restaurantId: (restaurant._id as any).toString(),
        type: 'profile-picture',
        category: 'profile-picture',
        version: nextVersion,
      },
    });

    stream.end(req.file.buffer);

    stream.on('finish', async (file: any) => {
      if (restaurant.profilePictureId) {
        try {
          await bucket.delete(new ObjectId(restaurant.profilePictureId as any));
        } catch (err) {
          console.warn('Unable to delete previous profile picture:', err);
        }
      }

      restaurant.profilePictureId = file._id as any;
      restaurant.featuredImageFileId = file._id as any;

      restaurant.mediaRefs!.push({
        fileId: file._id as ObjectId,
        type: 'image' as any,
        filename: file.filename,
        contentType: file.contentType || req.file!.mimetype,
        category: 'profile-picture' as any,
        version: nextVersion,
        uploadedAt: new Date(),
        isActive: true,
      });

      await restaurant.save();

      res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        profilePictureId: file._id.toString(),
      });
    });

    stream.on('error', (err) => next(err));
  } catch (err) {
    next(err);
  }
});

restaurantsRouter.delete('/:id/profile-picture', requireAuth, requireOwnRestaurant, async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const currentProfilePictureId = restaurant.profilePictureId?.toString();
    if (!currentProfilePictureId) {
      return res.status(400).json({ error: 'No profile picture to delete' });
    }

    const bucket = getGridFsBucket();
    try {
      await bucket.delete(new ObjectId(currentProfilePictureId));
    } catch (err) {
      console.warn('Unable to delete profile picture from GridFS:', err);
    }

    restaurant.mediaRefs = (restaurant.mediaRefs || []).filter(doc => doc.fileId.toString() !== currentProfilePictureId);

    const remainingProfilePictures = restaurant.mediaRefs.filter(doc => doc.category === 'profile-picture');
    if (remainingProfilePictures.length) {
      const latest = remainingProfilePictures.reduce((prev, curr) => (curr.version > prev.version ? curr : prev));
      latest.isActive = true;
      restaurant.profilePictureId = latest.fileId as any;
      restaurant.featuredImageFileId = latest.fileId as any;
    } else {
      restaurant.profilePictureId = undefined;
      restaurant.featuredImageFileId = undefined;
    }

    await restaurant.save();

    res.json({ success: true, message: 'Profile picture deleted successfully' });
  } catch (err) {
    next(err);
  }
});



