import express from 'express';
import { z } from 'zod';
import { Restaurant } from '../models/Restaurant.ts';
import multer from 'multer';
import { getGridFsBucket } from '../db/gridfs.ts';
import { requireAuth, requireOwnRestaurant } from '../middleware/auth.ts';
export const restaurantsRouter = express.Router();
restaurantsRouter.get('/', async (_req, res, next) => {
    try {
        const items = await Restaurant.find().lean();
        res.json({ items });
    }
    catch (err) {
        next(err);
    }
});
restaurantsRouter.get('/:id', async (req, res, next) => {
    try {
        const item = await Restaurant.findById(req.params.id).lean();
        if (!item)
            return res.status(404).json({ error: 'Not found' });
        res.json({ item });
    }
    catch (err) {
        next(err);
    }
});
const updateSchema = z.object({
    name: z.string().min(2).trim().optional(),
    city: z.enum(['Al Ain', 'Abu Dhabi', 'Dubai']).optional(),
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
        if (!item)
            return res.status(404).json({ error: 'Not found' });
        res.json({ item });
    }
    catch (err) {
        next(err);
    }
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
        if (!req.file)
            return res.status(400).json({ error: 'file is required' });
        const r = await Restaurant.findById(req.params.id);
        if (!r)
            return res.status(404).json({ error: 'Restaurant not found' });
        const type = req.file.mimetype.includes('pdf') ? 'pdf' : 'image';
        const bucket = getGridFsBucket();
        const stream = bucket.openUploadStream(req.file.originalname, {
            contentType: req.file.mimetype,
            metadata: { restaurantId: r._id.toString(), type },
        });
        stream.end(req.file.buffer);
        stream.on('finish', async (file) => {
            r.mediaRefs = r.mediaRefs || [];
            r.mediaRefs.push({ fileId: file._id, type: type, filename: file.filename, contentType: file.contentType || 'application/octet-stream' });
            await r.save();
            res.json({ id: file._id, filename: file.filename, contentType: file.contentType, type });
        });
        stream.on('error', (err) => next(err));
    }
    catch (err) {
        next(err);
    }
});
