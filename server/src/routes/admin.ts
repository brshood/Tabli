import express from 'express';
import { Restaurant } from '../models/Restaurant';
import { Reservation } from '../models/Reservation';
import { Rating } from '../models/Rating';
import { Table } from '../models/Table';
import { User } from '../models/User';
import { ObjectId } from 'mongodb';
import { env } from '../config/env';

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

// GET /admin/restaurants - Fetch all restaurants with aggregated counts
adminRouter.get('/restaurants', requireAdmin, async (req, res, next) => {
  try {
    const restaurants = await Restaurant.find().lean();
    const restaurantIds = restaurants.map((r: any) => r._id);
    
    // Get aggregated counts for each restaurant
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
    
    // Create maps for quick lookup
    const reservationCountMap = new Map<string, number>();
    reservationCounts.forEach((item: any) => {
      reservationCountMap.set(String(item._id), item.count);
    });
    
    const ratingCountMap = new Map<string, number>();
    ratingCounts.forEach((item: any) => {
      ratingCountMap.set(String(item._id), item.count);
    });
    
    const tableCountMap = new Map<string, number>();
    tableCounts.forEach((item: any) => {
      tableCountMap.set(String(item._id), item.count);
    });
    
    const userCountMap = new Map<string, number>();
    userCounts.forEach((item: any) => {
      userCountMap.set(String(item._id), item.count);
    });
    
    // Enrich restaurants with counts
    const enriched = restaurants.map((r: any) => ({
      ...r,
      id: r._id.toString(),
      fileCount: (r.mediaRefs || []).length,
      reservationCount: reservationCountMap.get(String(r._id)) || 0,
      ratingCount: ratingCountMap.get(String(r._id)) || 0,
      tableCount: tableCountMap.get(String(r._id)) || 0,
      userCount: userCountMap.get(String(r._id)) || 0,
    }));
    
    res.json({ restaurants: enriched });
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
    
    // Fetch all related data in parallel
    const [reservations, ratings, tables, users] = await Promise.all([
      Reservation.find({ restaurantId })
        .sort({ requestedAt: -1 })
        .limit(100)
        .lean(),
      Rating.find({ restaurantId })
        .sort({ createdAt: -1 })
        .lean(),
      Table.find({ restaurantId })
        .sort({ name: 1 })
        .lean(),
      User.find({ restaurantId })
        .select('-passwordHash -resetToken -resetTokenExpiresAt')
        .sort({ createdAt: -1 })
        .lean(),
    ]);
    
    res.json({
      restaurant: {
        ...restaurant,
        id: restaurant._id.toString(),
      },
      reservations: reservations.map((r: any) => ({
        ...r,
        id: r._id.toString(),
      })),
      ratings: ratings.map((r: any) => ({
        ...r,
        id: r._id.toString(),
      })),
      tables: tables.map((t: any) => ({
        ...t,
        id: t._id.toString(),
      })),
      users: users.map((u: any) => ({
        ...u,
        id: u._id.toString(),
      })),
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('ObjectId')) {
      return res.status(400).json({ error: 'Invalid restaurant ID' });
    }
    next(err);
  }
});

