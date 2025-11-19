import express from 'express';
import { z } from 'zod';
import { Restaurant } from '../models/Restaurant';
import { Reservation } from '../models/Reservation';
import { Rating } from '../models/Rating';
import { Table } from '../models/Table';
import { User } from '../models/User';
import { ObjectId } from 'mongodb';
import { env } from '../config/env';
import { deleteRestaurantProfile } from '../services/restaurantCleanup';
import { buildPaginationMeta, paginateModel } from '../services/pagination';
import { cleanupQueue } from '../queues/maintenanceQueue';

export const adminRouter = express.Router();

// Simple middleware to check admin authentication
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.substring(7);
  // Simple token check - in production, use proper JWT or session validation
  if (token !== 'admin-token') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

// POST /admin/login - Validate admin credentials from environment
adminRouter.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    if (username === env.ADMIN_USERNAME && password === env.ADMIN_PASSWORD) {
      // Return simple token for session management
      res.json({ 
        success: true, 
        token: 'admin-token',
        message: 'Login successful' 
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    next(err);
  }
});

const approvalSchema = z.object({
  status: z.enum(['pending', 'approved', 'denied']),
  notes: z.string().max(1000).optional(),
});

adminRouter.patch('/restaurants/:id/approval', requireAdmin, async (req, res, next) => {
  try {
    const { status, notes } = approvalSchema.parse(req.body);
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          approvalStatus: status,
          approvalNotes: notes || null,
        },
      },
      { new: true }
    );

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json({ restaurant });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/restaurants/:id', requireAdmin, async (req, res, next) => {
  try {
    const runAsync = req.query.async === 'true';
    if (runAsync) {
      await cleanupQueue.add('restaurant-delete', { restaurantId: req.params.id });
      return res.status(202).json({ queued: true });
    }

    const restaurant = await deleteRestaurantProfile(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json({ success: true, message: 'Restaurant deleted successfully' });
  } catch (err) {
    next(err);
  }
});

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  search: z.string().trim().optional(),
});

const paginatedQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
});

const reservationQuerySchema = paginatedQuerySchema.extend({
  status: z.enum(['pending', 'confirmed', 'seated', 'cancelled', 'no_show']).optional(),
  mode: z.enum(['reserve', 'waitlist']).optional(),
});

const ratingQuerySchema = paginatedQuerySchema.extend({
  minValue: z.coerce.number().min(1).max(5).optional(),
});

const tableQuerySchema = paginatedQuerySchema.extend({
  status: z.enum(['available', 'occupied', 'cleaning']).optional(),
});

const userQuerySchema = paginatedQuerySchema.extend({
  role: z.enum(['staff']).optional(),
});

// GET /admin/restaurants - Fetch paginated restaurants with aggregated counts
adminRouter.get('/restaurants', requireAdmin, async (req, res, next) => {
  try {
    const { page, limit, search } = listQuerySchema.parse(req.query);
    const filter: Record<string, any> = {};
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { name: regex },
        { city: regex },
        { cuisine: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    const [restaurants, total] = await Promise.all([
      Restaurant.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('name city cuisine email phone address description openingHours closingHours priceRange mediaRefs approvalStatus approvalNotes createdAt updatedAt')
        .lean(),
      Restaurant.countDocuments(filter),
    ]);

    const restaurantIds = restaurants.map((r: any) => r._id);

    let reservationCountMap = new Map<string, number>();
    let ratingCountMap = new Map<string, number>();
    let tableCountMap = new Map<string, number>();
    let userCountMap = new Map<string, number>();

    if (restaurantIds.length > 0) {
      const [reservationCounts, ratingCounts, tableCounts, userCounts] = await Promise.all([
        Reservation.aggregate([
          { $match: { restaurantId: { $in: restaurantIds } } },
          { $group: { _id: '$restaurantId', count: { $sum: 1 } } },
        ]),
        Rating.aggregate([
          { $match: { restaurantId: { $in: restaurantIds } } },
          { $group: { _id: '$restaurantId', count: { $sum: 1 } } },
        ]),
        Table.aggregate([
          { $match: { restaurantId: { $in: restaurantIds } } },
          { $group: { _id: '$restaurantId', count: { $sum: 1 } } },
        ]),
        User.aggregate([
          { $match: { restaurantId: { $in: restaurantIds } } },
          { $group: { _id: '$restaurantId', count: { $sum: 1 } } },
        ]),
      ]);

      reservationCountMap = new Map(reservationCounts.map((item: any) => [String(item._id), item.count]));
      ratingCountMap = new Map(ratingCounts.map((item: any) => [String(item._id), item.count]));
      tableCountMap = new Map(tableCounts.map((item: any) => [String(item._id), item.count]));
      userCountMap = new Map(userCounts.map((item: any) => [String(item._id), item.count]));
    }

    const enriched = restaurants.map((r: any) => ({
      ...r,
      id: r._id.toString(),
      fileCount: (r.mediaRefs || []).length,
      reservationCount: reservationCountMap.get(String(r._id)) || 0,
      ratingCount: ratingCountMap.get(String(r._id)) || 0,
      tableCount: tableCountMap.get(String(r._id)) || 0,
      userCount: userCountMap.get(String(r._id)) || 0,
    }));

    res.json({
      restaurants: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /admin/restaurants/:id - Fetch single restaurant with complete details
adminRouter.get('/restaurants/:id', requireAdmin, async (req, res, next) => {
  try {
    const restaurantId = new ObjectId(req.params.id);
    
    const restaurant = await Restaurant.findById(restaurantId).lean();
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    const [reservationTotal, ratingTotal, tableTotal, userTotal] = await Promise.all([
      Reservation.countDocuments({ restaurantId }),
      Rating.countDocuments({ restaurantId }),
      Table.countDocuments({ restaurantId }),
      User.countDocuments({ restaurantId }),
    ]);

    res.json({
      restaurant: {
        ...restaurant,
        id: restaurant._id.toString(),
      },
      stats: {
        reservations: reservationTotal,
        ratings: ratingTotal,
        tables: tableTotal,
        users: userTotal,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('ObjectId')) {
      return res.status(400).json({ error: 'Invalid restaurant ID' });
    }
    next(err);
  }
});

adminRouter.get('/restaurants/:id/reservations', requireAdmin, async (req, res, next) => {
  try {
    const { page, limit, status, mode } = reservationQuerySchema.parse(req.query);
    const restaurantId = new ObjectId(req.params.id);
    const filter: Record<string, any> = { restaurantId };
    if (status) {
      filter.status = status;
    }
    if (mode) {
      filter.mode = mode;
    }

    const { items, pagination } = await paginateModel(Reservation, filter, {
      page,
      limit,
      sort: { requestedAt: -1 },
      select:
        'name email phone partySize status requestedAt confirmedAt seatedAt leftAt cancelledAt mode reservationType queuePosition tableId createdAt',
    });

    res.json({
      items: items.map((r: any) => ({ ...r, id: r._id.toString() })),
      pagination,
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/restaurants/:id/ratings', requireAdmin, async (req, res, next) => {
  try {
    const { page, limit, minValue } = ratingQuerySchema.parse(req.query);
    const restaurantId = new ObjectId(req.params.id);
    const filter: Record<string, any> = { restaurantId };
    if (minValue) {
      filter.value = { $gte: minValue };
    }

    const { items, pagination } = await paginateModel(Rating, filter, {
      page,
      limit,
      sort: { createdAt: -1 },
      select: 'value comment name email phone showName createdAt',
    });

    res.json({
      items: items.map((r: any) => ({ ...r, id: r._id.toString() })),
      pagination,
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/restaurants/:id/tables', requireAdmin, async (req, res, next) => {
  try {
    const { page, limit, status } = tableQuerySchema.parse(req.query);
    const restaurantId = new ObjectId(req.params.id);
    const filter: Record<string, any> = { restaurantId };
    if (status) {
      filter.status = status;
    }

    const { items, pagination } = await paginateModel(Table, filter, {
      page,
      limit,
      sort: { name: 1 },
      select: 'name capacity status currentReservationId createdAt',
    });

    res.json({
      items: items.map((t: any) => ({ ...t, id: t._id.toString() })),
      pagination,
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/restaurants/:id/users', requireAdmin, async (req, res, next) => {
  try {
    const { page, limit, role } = userQuerySchema.parse(req.query);
    const restaurantId = new ObjectId(req.params.id);
    const filter: Record<string, any> = { restaurantId };
    if (role) {
      filter.role = role;
    }

    const { items, pagination } = await paginateModel(User, filter, {
      page,
      limit,
      sort: { createdAt: -1 },
      select: 'name email role createdAt',
    });

    res.json({
      items: items.map((u: any) => ({ ...u, id: u._id.toString() })),
      pagination,
    });
  } catch (err) {
    next(err);
  }
});

