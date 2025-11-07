import express from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Menu } from '../models/Menu';
import { requireAuth, requireOwnRestaurant, AuthRequest } from '../middleware/auth';

export const menusRouter = express.Router();

const menuItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().optional(),
  price: z.string().min(1),
});

const updateMenuSchema = z.object({
  items: z.array(menuItemSchema),
});

// GET /menus/:restaurantId - Get menu for a restaurant (public)
menusRouter.get('/:restaurantId', async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ error: 'Invalid restaurant ID' });
    }

    let menu = await Menu.findOne({ restaurantId }).lean();
    
    // If menu doesn't exist, create an empty one
    if (!menu) {
      menu = {
        _id: new mongoose.Types.ObjectId(),
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    res.json({ 
      menu: {
        restaurantId: menu.restaurantId.toString(),
        items: menu.items || [],
      }
    });
  } catch (err) {
    next(err);
  }
});

// PUT /menus/:restaurantId - Update menu (requires auth)
menusRouter.put('/:restaurantId', requireAuth, requireOwnRestaurant, async (req: AuthRequest, res, next) => {
  try {
    const { restaurantId } = req.params;
    const data = updateMenuSchema.parse(req.body);

    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ error: 'Invalid restaurant ID' });
    }

    // Upsert menu - create if doesn't exist, update if it does
    const menu = await Menu.findOneAndUpdate(
      { restaurantId },
      { 
        $set: { 
          items: data.items,
          updatedAt: new Date(),
        }
      },
      { 
        new: true, 
        upsert: true,
        runValidators: true 
      }
    );

    res.json({ 
      success: true,
      menu: {
        restaurantId: menu.restaurantId.toString(),
        items: menu.items,
      }
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid menu data', details: err.errors });
    }
    next(err);
  }
});

