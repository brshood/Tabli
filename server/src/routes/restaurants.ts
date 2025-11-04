import express from 'express';
import { z } from 'zod';
import { Restaurant } from '../models/Restaurant.ts';
import multer from 'multer';
import { getGridFsBucket } from '../db/gridfs.ts';
import { ObjectId } from 'mongodb';
import { requireAuth, requireOwnRestaurant, AuthRequest } from '../middleware/auth.ts';
import mongoose from 'mongoose';

export const restaurantsRouter = express.Router();

restaurantsRouter.get('/', async (_req, res, next) => {
  try {
    const items = await Restaurant.find().lean();
    res.json({ items });
  } catch (err) { next(err); }
});

restaurantsRouter.get('/:id', async (req, res, next) => {
  try {
    const item = await Restaurant.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ item });
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

// POST /:id/profile-picture - Upload restaurant profile picture
restaurantsRouter.post('/:id/profile-picture', requireAuth, requireOwnRestaurant, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const r = await Restaurant.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Restaurant not found' });

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Only image files (JPEG, PNG, WebP) are allowed for profile pictures' });
    }

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    const stream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
    });

    stream.end(req.file.buffer);

    stream.on('finish', async () => {
      try {
        // 1. New file is now uploaded to GridFS (stream.id is valid)
        
        // 2. Find old profile picture to delete AFTER saving new one
        let oldFileId = null;
        if (r.mediaRefs) {
          for (const doc of r.mediaRefs) {
            if (doc.category === 'profile-picture' && doc.isActive) {
              doc.isActive = false;
              oldFileId = doc.fileId; // Store for deletion AFTER save
            }
          }
        }

        // 3. Calculate next version number
        const existingProfilePics = r.mediaRefs?.filter(doc => doc.category === 'profile-picture') || [];
        const maxVersion = existingProfilePics.length > 0 
          ? Math.max(...existingProfilePics.map(doc => doc.version))
          : 0;
        const nextVersion = maxVersion + 1;

        // 4. Add new profile picture to mediaRefs
        r.mediaRefs = r.mediaRefs || [];
        r.mediaRefs.push({
          fileId: stream.id as any,
          type: 'image' as any,
          filename: req.file!.originalname,
          contentType: req.file!.mimetype,
          category: 'profile-picture' as any,
          version: nextVersion,
          uploadedAt: new Date(),
          isActive: true,
        });

        await r.save();

        console.log('Profile picture saved to mediaRefs:', { 
          restaurantId: r._id, 
          profilePictureId: stream.id.toString(),
          version: nextVersion
        });

        // 5. NOW delete old file from GridFS (after new one is confirmed saved)
        if (oldFileId) {
          try {
            await bucket.delete(oldFileId);
            console.log('Deleted old profile picture:', oldFileId.toString());
          } catch (err) {
            console.error('Failed to delete old profile picture from GridFS:', err);
          }
        }

        res.json({ 
          success: true,
          profilePictureId: stream.id.toString(),
          message: 'Profile picture uploaded successfully' 
        });
      } catch (err) {
        console.error('Error in finish handler:', err);
        res.status(500).json({ error: 'Failed to save profile picture' });
      }
    });

    stream.on('error', (err: any) => {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Failed to upload profile picture' });
    });
  } catch (err) { 
    next(err); 
  }
});

// DELETE /:id/profile-picture - Delete restaurant profile picture
restaurantsRouter.delete('/:id/profile-picture', requireAuth, requireOwnRestaurant, async (req, res, next) => {
  try {
    const r = await Restaurant.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Restaurant not found' });

    // Find the active profile picture in mediaRefs
    const profilePicIndex = r.mediaRefs?.findIndex(
      doc => doc.category === 'profile-picture' && doc.isActive
    );

    if (profilePicIndex === undefined || profilePicIndex === -1) {
      return res.status(404).json({ error: 'No profile picture to delete' });
    }

    const profilePic = r.mediaRefs![profilePicIndex];

    // Delete from GridFS
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    try {
      await bucket.delete(profilePic.fileId);
    } catch (err) {
      console.error('Failed to delete profile picture from GridFS:', err);
    }

    // Remove from mediaRefs
    r.mediaRefs!.splice(profilePicIndex, 1);
    await r.save();

    res.json({ success: true, message: 'Profile picture deleted successfully' });
  } catch (err) { 
    next(err); 
  }
});



