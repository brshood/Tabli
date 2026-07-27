import express from 'express';
import { z } from 'zod';
import { Restaurant } from '../models/Restaurant';
import { Rating } from '../models/Rating';
import { Reservation } from '../models/Reservation';
import multer from 'multer';
import { getGridFsBucket } from '../db/gridfs';
import { ObjectId } from 'mongodb';
import { requireAuth, requireOwnRestaurant } from '../middleware/auth';
import { deleteRestaurantProfile } from '../services/restaurantCleanup';
import { sendSmsViaEand, normalizeNotificationMsisdn } from '../services/eandSmsClient';
import { getDaysAgoStartGST } from '../utils/dateFormat';
import { buildActiveQueueFilter } from '../services/queuePosition';

export const restaurantsRouter = express.Router();

restaurantsRouter.get('/', async (_req, res, next) => {
  try {
    const items = await Restaurant.find({ approvalStatus: 'approved' }).lean();
    const ids = items.map((r: any) => r._id);
    
    // Calculate date range for last 7 days in GST timezone
    const now = new Date();
    const sevenDaysAgo = getDaysAgoStartGST(7);
    
    // Batch all queries in parallel for better performance
    const [summaries, waitTimeStats, queueCounts, weeklyVisitStats] = await Promise.all([
      Rating.aggregate([
        { $match: { restaurantId: { $in: ids } } },
        { $group: { _id: '$restaurantId', count: { $sum: 1 }, avg: { $avg: '$value' } } },
      ]),
      // Calculate average wait time for each restaurant from last 7 days
      Reservation.aggregate([
        {
          $match: {
            restaurantId: { $in: ids },
            status: 'seated',
            seatedAt: { $exists: true, $gte: sevenDaysAgo, $lte: now },
            requestedAt: { $exists: true }
          }
        },
        {
          $addFields: {
            waitMinutes: {
              $divide: [
                { $subtract: ['$seatedAt', '$requestedAt'] },
                60000 // Convert milliseconds to minutes
              ]
            }
          }
        },
        {
          $group: {
            _id: '$restaurantId',
            avgWaitTime: { $avg: '$waitMinutes' }
          }
        }
      ]),
      // Count the live waiting line. Must use the shared queue filter so this
      // number agrees with the staff board and the position customers are told:
      // a narrower `mode: 'waitlist'` match drops bookings that turned into
      // waitlist entries, and counts called guests and finished service days.
      Reservation.aggregate([
        { $match: buildActiveQueueFilter({ $in: ids }, now) },
        {
          $group: {
            _id: '$restaurantId',
            count: { $sum: 1 }
          }
        }
      ]),
      // Weekly visits = bookings created in last 7 days (app reserve/queue; exclude user/staff cancels)
      Reservation.aggregate([
        {
          $match: {
            restaurantId: { $in: ids },
            requestedAt: { $exists: true, $gte: sevenDaysAgo, $lte: now },
            $or: [
              { status: { $ne: 'cancelled' } },
              { status: 'cancelled', cancellationReason: 'daily_reset' },
            ],
          }
        },
        {
          $group: {
            _id: '$restaurantId',
            count: { $sum: 1 }
          }
        }
      ])
    ]);
    
    const summaryById = new Map<string, { count: number; avg: number }>();
    summaries.forEach((s: any) => summaryById.set(String(s._id), { count: s.count, avg: s.avg }));
    
    const waitTimeById = new Map<string, number>();
    waitTimeStats.forEach((w: any) => {
      waitTimeById.set(String(w._id), Math.round(w.avgWaitTime));
    });
    
    const queueCountById = new Map<string, number>();
    queueCounts.forEach((q: any) => queueCountById.set(String(q._id), q.count));

    const weeklyVisitsById = new Map<string, number>();
    weeklyVisitStats.forEach((v: any) => weeklyVisitsById.set(String(v._id), v.count));
    
    // Helper function to get image file ID - ONLY returns profile pictures, no fallbacks
    // Only display cover photo if a restaurant profile picture exists
    const getImageFileId = (r: any): string | null => {
      // 1. First priority: profilePictureId (dedicated field for profile pictures)
      if (r.profilePictureId) {
        return r.profilePictureId.toString();
      }
      
      // 2. Second priority: featuredImageFileId (should be set to profile picture on upload)
      if (r.featuredImageFileId) {
        return r.featuredImageFileId.toString();
      }
      
      // 3. Third priority: Look for active profile pictures in mediaRefs
      if (Array.isArray(r.mediaRefs)) {
        const profilePic = r.mediaRefs.find((m: any) => 
          m.isActive && 
          m.type === 'image' && 
          m.category === 'profile-picture'
        );
        if (profilePic) {
          return profilePic.fileId.toString();
        }
      }
      
      // No fallback - return null if no profile picture exists
      return null;
    };
    
    // Enrich with imageUrl - only if profile picture exists
    // Customer listing: "has seating" from staff toggles only (not physical table counts)
    const enriched = items.map((r: any) => {
      const imageFileId = getImageFileId(r);
      const imageUrl = imageFileId ? `/media/${imageFileId}` : null;
      const s = summaryById.get(String(r._id));
      const ratingSummary = s ? { count: s.count, average: Number(s.avg.toFixed(2)) } : { count: 0, average: 0 };
      const bothSectionsFull = r.indoorFull === true && r.outdoorFull === true;
      const availableTables = bothSectionsFull ? 0 : 1;
      const avgWaitTime = waitTimeById.get(String(r._id)) || null;
      const waitingInLine = queueCountById.get(String(r._id)) || 0;
      const weeklyVisits = weeklyVisitsById.get(String(r._id)) || 0;
      return { ...r, imageUrl, ratingSummary, availableTables, avgWaitTime, waitingInLine, weeklyVisits };
    });
    
    res.json({ items: enriched });
  } catch (err) { next(err); }
});

restaurantsRouter.get('/:id', async (req, res, next) => {
  try {
    const item = await Restaurant.findById(req.params.id).lean();
    if (!item || item.approvalStatus !== 'approved') {
      return res.status(404).json({ error: 'Not found' });
    }
    
    // Helper function to get image file ID - ONLY returns profile pictures, no fallbacks
    // Only display cover photo if a restaurant profile picture exists
    const getImageFileId = (r: any): string | null => {
      // 1. First priority: profilePictureId (dedicated field for profile pictures)
      if (r.profilePictureId) {
        return r.profilePictureId.toString();
      }
      
      // 2. Second priority: featuredImageFileId (should be set to profile picture on upload)
      if (r.featuredImageFileId) {
        return r.featuredImageFileId.toString();
      }
      
      // 3. Third priority: Look for active profile pictures in mediaRefs
      if (Array.isArray(r.mediaRefs)) {
        const profilePic = r.mediaRefs.find((m: any) => 
          m.isActive && 
          m.type === 'image' && 
          m.category === 'profile-picture'
        );
        if (profilePic) {
          return profilePic.fileId.toString();
        }
      }
      
      // No fallback - return null if no profile picture exists
      return null;
    };
    
    const imageFileId = getImageFileId(item);
    const imageUrl = imageFileId ? `/media/${imageFileId}` : null;
    
    const sevenDaysAgo = getDaysAgoStartGST(7);
    const now = new Date();

    const [s, waitingInLine, weeklyVisits] = await Promise.all([
      Rating.aggregate([
        { $match: { restaurantId: new ObjectId(req.params.id) } },
        { $group: { _id: '$restaurantId', count: { $sum: 1 }, avg: { $avg: '$value' } } },
        { $limit: 1 },
      ]),
      Reservation.countDocuments(buildActiveQueueFilter(item._id, now)),
      Reservation.countDocuments({
        restaurantId: item._id,
        requestedAt: { $exists: true, $gte: sevenDaysAgo, $lte: now },
        $or: [
          { status: { $ne: 'cancelled' } },
          { status: 'cancelled', cancellationReason: 'daily_reset' },
        ],
      }),
    ]);
    
    const ratingSummary = s.length ? { count: s[0].count, average: Number(s[0].avg.toFixed(2)) } : { count: 0, average: 0 };
    const bothSectionsFull = (item as any).indoorFull === true && (item as any).outdoorFull === true;
    const availableTables = bothSectionsFull ? 0 : 1;
    res.json({ item: { ...item, imageUrl, ratingSummary, availableTables, waitingInLine, weeklyVisits } });
  } catch (err) { next(err); }
});

const menuItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().optional(),
  price: z.string().min(1),
});

const featuredMenuItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.string().optional(),
});

const locationUrlSchema = z
  .string()
  .trim()
  .url({ message: 'Location link must be a valid URL' })
  .max(2048);

const updateSchema = z.object({
  name: z.string().min(2).trim().optional(),
  city: z.enum(['Al Ain','Abu Dhabi','Dubai']).optional(),
  cuisine: z.string().min(2).trim().optional(),
  phone: z.string().min(10).trim().optional(),
  email: z.string().email().trim().optional(),
  description: z.string().trim().optional(),
  address: z.string().min(5).trim().optional(),
  locationUrl: z.union([locationUrlSchema, z.null()]).optional(),
  openingHours: z.string().optional(),
  closingHours: z.string().optional(),
  priceRange: z.string().optional(),
  menu: z.array(menuItemSchema).optional(),
  featuredMenuItems: z.array(featuredMenuItemSchema).max(6).optional(),
  waitTimeMinMinutes: z.number().int().min(0).max(300).optional(),
  waitTimeMaxMinutes: z.number().int().min(0).max(300).optional(),
  waitTimeDisplayText: z.string().trim().max(100).optional(),
}).refine((data) => {
  if (typeof data.waitTimeMinMinutes === 'number' && typeof data.waitTimeMaxMinutes === 'number') {
    return data.waitTimeMinMinutes <= data.waitTimeMaxMinutes;
  }
  return true;
}, {
  message: 'Minimum wait time must be less than or equal to maximum wait time',
  path: ['waitTimeMinMinutes'],
});

restaurantsRouter.put('/:id', requireAuth, requireOwnRestaurant, async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const item = await Restaurant.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, upsert: false });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ item });
  } catch (err) { next(err); }
});

restaurantsRouter.delete('/:id', requireAuth, requireOwnRestaurant, async (req, res, next) => {
  try {
    const restaurant = await deleteRestaurantProfile(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    res.json({ success: true, message: 'Restaurant profile deleted' });
  } catch (err) {
    next(err);
  }
});

// PATCH /restaurants/:id/notification-phone - Update notification phone for SMS alerts
const notificationPhoneSchema = z.object({
  phone: z.string().min(7).max(20),
});

restaurantsRouter.patch('/:id/notification-phone', requireAuth, requireOwnRestaurant, async (req, res, next) => {
  try {
    const data = notificationPhoneSchema.parse(req.body);
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Normalize to E.164 so the SMS gateway always gets a dialable number.
    // Rejects the common mistakes (country code typed twice, missing digits).
    const msisdn = normalizeNotificationMsisdn(data.phone);
    if (!msisdn) {
      return res.status(400).json({
        error: 'That phone number does not look valid. Enter the number without the country code, e.g. 501234567.',
      });
    }
    const normalizedPhone = `+${msisdn}`;

    // Add to history if not already present
    const existingPhones = restaurant.notificationPhones || [];
    if (!existingPhones.includes(normalizedPhone)) {
      existingPhones.push(normalizedPhone);
      restaurant.notificationPhones = existingPhones;
    }

    // Set as active notification phone
    restaurant.activeNotificationPhone = normalizedPhone;
    await restaurant.save();

    res.json({ 
      success: true, 
      activeNotificationPhone: restaurant.activeNotificationPhone,
      notificationPhones: restaurant.notificationPhones,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

// GET /restaurants/:id/notification-phones - Get notification phone settings
restaurantsRouter.get('/:id/notification-phones', requireAuth, requireOwnRestaurant, async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).select('notificationPhones activeNotificationPhone').lean();
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json({
      activeNotificationPhone: restaurant.activeNotificationPhone || null,
      notificationPhones: restaurant.notificationPhones || [],
    });
  } catch (err) {
    next(err);
  }
});

// POST /restaurants/:id/notification-phone/test - Send a test SMS to the active notification phone
// Lets staff confirm on the spot that booking alerts will actually reach their phone,
// and surfaces the gateway error instead of hiding it in server logs.
restaurantsRouter.post('/:id/notification-phone/test', requireAuth, requireOwnRestaurant, async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).select('name activeNotificationPhone').lean();
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const phone = (restaurant as any).activeNotificationPhone as string | undefined;
    if (!phone) {
      return res.status(400).json({ error: 'Save a notification number first' });
    }

    try {
      await sendSmsViaEand({
        to: phone,
        text: `Tabli test alert for ${(restaurant as any).name || 'your restaurant'}. Booking notifications will arrive on this number.`,
        category: 'otp',
      });
      res.json({ success: true, sentTo: phone });
    } catch (smsError) {
      const message = smsError instanceof Error ? smsError.message : String(smsError);
      console.error('[NOTIFY_PHONE_TEST] Test SMS failed', { restaurantId: req.params.id, phone, error: message });
      res.status(502).json({ error: `Could not send SMS to ${phone}: ${message}` });
    }
  } catch (err) {
    next(err);
  }
});

// GET /restaurants/:id/availability-override - Get current indoor/outdoor full state
restaurantsRouter.get('/:id/availability-override', requireAuth, requireOwnRestaurant, async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).select('indoorFull outdoorFull closedForCustomers').lean();
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    res.json({
      indoorFull: (restaurant as any).indoorFull ?? false,
      outdoorFull: (restaurant as any).outdoorFull ?? false,
      closedForCustomers: (restaurant as any).closedForCustomers ?? false,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /restaurants/:id/availability-override - Staff toggles for indoor/outdoor full
const availabilityOverrideSchema = z.object({
  indoorFull: z.boolean().optional(),
  outdoorFull: z.boolean().optional(),
  closedForCustomers: z.boolean().optional(),
});

restaurantsRouter.patch('/:id/availability-override', requireAuth, requireOwnRestaurant, async (req, res, next) => {
  try {
    const data = availabilityOverrideSchema.parse(req.body);
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { $set: data },
      { new: true }
    );
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    res.json({
      indoorFull: (restaurant as any).indoorFull ?? false,
      outdoorFull: (restaurant as any).outdoorFull ?? false,
      closedForCustomers: (restaurant as any).closedForCustomers ?? false,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

// DELETE /restaurants/:id/notification-phone/:phone - Remove a phone from history
restaurantsRouter.delete('/:id/notification-phone/:phone', requireAuth, requireOwnRestaurant, async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const phoneToRemove = decodeURIComponent(req.params.phone);
    const existingPhones = restaurant.notificationPhones || [];
    restaurant.notificationPhones = existingPhones.filter(p => p !== phoneToRemove);

    // If the removed phone was the active one, clear it
    if (restaurant.activeNotificationPhone === phoneToRemove) {
      restaurant.activeNotificationPhone = restaurant.notificationPhones[0] || undefined;
    }

    await restaurant.save();

    res.json({
      success: true,
      activeNotificationPhone: restaurant.activeNotificationPhone || null,
      notificationPhones: restaurant.notificationPhones,
    });
  } catch (err) {
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

    stream.on('finish', async () => {
      const fileId = stream.id as ObjectId;
      
      if (restaurant.profilePictureId) {
        try {
          await bucket.delete(new ObjectId(restaurant.profilePictureId as any));
        } catch (err) {
          console.warn('Unable to delete previous profile picture:', err);
        }
      }

      restaurant.profilePictureId = fileId as any;
      restaurant.featuredImageFileId = fileId as any;

      restaurant.mediaRefs!.push({
        fileId: fileId,
        type: 'image' as any,
        filename: stream.filename || req.file!.originalname,
        contentType: req.file!.mimetype,
        category: 'profile-picture' as any,
        version: nextVersion,
        uploadedAt: new Date(),
        isActive: true,
      });

      await restaurant.save();

      res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        profilePictureId: fileId.toString(),
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

// Helper function to normalize phone numbers for comparison
function normalizePhoneNumber(phone: string | undefined): string | null {
  if (!phone) return null;
  // Remove all non-digit characters (spaces, dashes, parentheses, plus signs, etc.)
  const digitsOnly = phone.replace(/\D/g, '');
  // Remove common country codes if present (UAE: 971, US/Canada: 1)
  // Keep the last 10-15 digits (typical phone number length)
  if (digitsOnly.length > 10) {
    // Remove leading country codes
    if (digitsOnly.startsWith('971') && digitsOnly.length > 10) {
      return digitsOnly.substring(3);
    }
    if (digitsOnly.startsWith('1') && digitsOnly.length > 10) {
      return digitsOnly.substring(1);
    }
    // If still too long, take the last 15 digits
    return digitsOnly.slice(-15);
  }
  return digitsOnly || null;
}

// Validation schema for rating submission
const ratingSchema = z.object({
  value: z.number().min(1).max(5),
  comment: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  showName: z.boolean().optional(),
}).refine((data) => data.email || data.phone, {
  message: 'At least one of email or phone must be provided',
  path: ['email', 'phone'],
});

// GET /restaurants/:id/ratings - Retrieve all ratings for a restaurant
restaurantsRouter.get('/:id/ratings', async (req, res, next) => {
  try {
    const restaurantId = req.params.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Validate restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const [ratings, total] = await Promise.all([
      Rating.find({ restaurantId: new ObjectId(restaurantId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .select('value comment name showName createdAt'),
      Rating.countDocuments({ restaurantId: new ObjectId(restaurantId) }),
    ]);

    // Handle anonymous names - show "Guest" if showName is false or name is missing
    const processedRatings = ratings.map((rating: any) => {
      const shouldShowName = rating.showName === true && rating.name;
      return {
        ...rating,
        name: shouldShowName ? rating.name : 'Guest',
      };
    });

    res.json({
      items: processedRatings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /restaurants/:id/ratings - Submit a new rating with verification
restaurantsRouter.post('/:id/ratings', async (req, res, next) => {
  try {
    const restaurantId = req.params.id;

    // Validate restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Validate request body
    const data = ratingSchema.parse(req.body);

    // Normalize phone number if provided
    const normalizedPhone = normalizePhoneNumber(data.phone);

    // Build query to check for matching reservations
    const queryConditions: any[] = [];
    
    if (data.email) {
      queryConditions.push({ email: data.email });
    }
    
    if (normalizedPhone) {
      // We need to normalize phone numbers in reservations too for comparison
      // Since we can't easily do this in a single query, we'll fetch reservations and check
      queryConditions.push({ phone: { $exists: true, $ne: null } });
    }

    if (queryConditions.length === 0) {
      return res.status(400).json({ error: 'Please provide a valid email address or phone number.' });
    }

    // Find reservations with completed visits (seated or confirmed) for this restaurant
    const reservations = await Reservation.find({
      restaurantId: new ObjectId(restaurantId),
      status: { $in: ['seated', 'confirmed'] },
      $or: queryConditions,
    }).lean();

    // Check if any reservation matches the provided email or normalized phone
    let hasMatch = false;
    
    if (data.email) {
      hasMatch = reservations.some(r => r.email && r.email.toLowerCase() === data.email!.toLowerCase());
    }
    
    if (!hasMatch && normalizedPhone) {
      // Check normalized phone numbers
      hasMatch = reservations.some(r => {
        if (!r.phone) return false;
        const normalizedReservationPhone = normalizePhoneNumber(r.phone);
        return normalizedReservationPhone === normalizedPhone;
      });
    }

    if (!hasMatch) {
      return res.status(403).json({
        error: 'We only accept reviews from previous visitors. Please use the email or phone number you used when making your reservation.',
      });
    }

    // Check for duplicate review (email OR phone already has a review for this restaurant)
    if (normalizedPhone) {
      // For phone matching, we need to check normalized phones
      // We'll fetch existing ratings and compare normalized phones
      const existingRatings = await Rating.find({
        restaurantId: new ObjectId(restaurantId),
        phone: { $exists: true, $ne: null },
      }).lean();
      
      const hasDuplicatePhone = existingRatings.some((r: any) => {
        if (!r.phone) return false;
        const existingNormalizedPhone = normalizePhoneNumber(r.phone);
        return existingNormalizedPhone === normalizedPhone;
      });
      
      if (hasDuplicatePhone) {
        return res.status(409).json({
          error: 'You have already submitted a review for this restaurant.',
        });
      }
    }
    
    if (data.email) {
      const existingRating = await Rating.findOne({
        restaurantId: new ObjectId(restaurantId),
        email: data.email,
      });
      
      if (existingRating) {
        return res.status(409).json({
          error: 'You have already submitted a review for this restaurant.',
        });
      }
    }

    // Create the rating
    const rating = await Rating.create({
      restaurantId: new ObjectId(restaurantId),
      value: data.value,
      comment: data.comment,
      name: data.name,
      email: data.email,
      phone: data.phone,
      showName: data.showName ?? false,
    });

    res.status(201).json({ rating });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});



