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
import { sendEmail, buildEmailTemplate } from '../services/email';

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

    // #9 - Send email when restaurant is denied
    if (status === 'denied' && restaurant.email) {
      try {
        await sendEmail({
          to: restaurant.email,
          subject: 'Tabli Application Status Update',
          text: `Your application to join Tabli has been reviewed. ${notes ? `Reason: ${notes}` : ''}`,
          html: buildEmailTemplate({
            heading: 'Application Update',
            intro: `Dear ${restaurant.name},`,
            lines: [
              'Thank you for your interest in joining Tabli.',
              'After reviewing your application, we are unable to approve it at this time.',
              ...(notes ? [`Reason: ${notes}`] : []),
              'If you have any questions or would like to reapply in the future, please contact us at tabli.team@gmail.com.'
            ],
            footer: 'Best regards, The Tabli Team'
          })
        });
        console.log(`[ADMIN] Denial email sent to ${restaurant.email}`);
      } catch (emailError) {
        console.error('[ADMIN] Failed to send denial email:', emailError);
        // Don't fail the request if email fails
      }
    }

    // #23 - Send email when restaurant is approved
    if (status === 'approved' && restaurant.email) {
      try {
        await sendEmail({
          to: restaurant.email,
          subject: 'Welcome to Tabli! Your Restaurant Has Been Approved',
          text: `Great news! Your restaurant "${restaurant.name}" has been approved and is now live on Tabli.`,
          html: buildEmailTemplate({
            heading: 'Welcome to Tabli!',
            intro: `Great news! Your restaurant "${restaurant.name}" has been approved.`,
            lines: [
              'You can now start accepting reservations and managing your waitlist.',
              'Log in to your staff dashboard to set up your tables, opening hours, and menu.',
              'Customers can now find and book tables at your restaurant through Tabli.'
            ],
            actionText: 'Go to Dashboard',
            actionUrl: `${process.env.FRONTEND_URL || 'https://tabli.netlify.app'}/#staff`,
            footer: 'Welcome to the Tabli family! If you need any help, contact us at tabli.team@gmail.com'
          })
        });
        console.log(`[ADMIN] Approval email sent to ${restaurant.email}`);
      } catch (emailError) {
        console.error('[ADMIN] Failed to send approval email:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.json({ restaurant });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/restaurants/:id', requireAdmin, async (req, res, next) => {
  try {
    const restaurant = await deleteRestaurantProfile(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json({ success: true, message: 'Restaurant deleted successfully' });
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

// GET /admin/feedback - Get all feedback submissions
adminRouter.get('/feedback', requireAdmin, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Find all reservations with feedback
    const [feedbackItems, total] = await Promise.all([
      Reservation.find({ 'postBookingSurvey': { $exists: true } })
        .populate('restaurantId', 'name city')
        .sort({ 'postBookingSurvey.submittedAt': -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Reservation.countDocuments({ 'postBookingSurvey': { $exists: true } })
    ]);

    const formattedFeedback = feedbackItems.map((item: any) => ({
      reservationId: item._id.toString(),
      restaurantName: item.restaurantId?.name || 'Unknown',
      restaurantCity: item.restaurantId?.city || '',
      customerName: item.name || 'Anonymous',
      partySize: item.partySize,
      contactMethod: item.contactMethod,
      email: item.email,
      phone: item.phone,
      hearAboutUs: item.postBookingSurvey.hearAboutUs,
      specialRequirements: item.postBookingSurvey.specialRequirements,
      improvements: item.postBookingSurvey.improvements,
      submittedAt: item.postBookingSurvey.submittedAt,
      reservationDate: item.requestedAt,
    }));

    res.json({
      items: formattedFeedback,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
});

