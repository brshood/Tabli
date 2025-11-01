import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.ts';
import { Restaurant } from '../models/Restaurant.ts';
import { signJwt, verifyJwt } from '../utils/jwt.ts';
import { sendEmail } from '../services/email.ts';

export const authRouter = express.Router();

// Strong password: 8+ chars, 1 uppercase, 1 number, 1 special char
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const signupSchema = z.object({
  name: z.string().min(2).trim(),
  email: z.string().email().trim().toLowerCase(),
  password: passwordSchema,
  // Restaurant fields
  restaurantName: z.string().min(2).trim(),
  restaurantCity: z.enum(['Al Ain', 'Abu Dhabi', 'Dubai']),
  restaurantCuisine: z.string().min(2).trim(),
  restaurantPhone: z.string().min(10).trim(),
  restaurantAddress: z.string().min(5).trim(),
});

authRouter.post('/signup', async (req, res, next) => {
  try {
    const parsed = signupSchema.parse(req.body);
    const { name, email, password, restaurantName, restaurantCity, restaurantCuisine, restaurantPhone, restaurantAddress } = parsed;
    
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already in use' });
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create restaurant first
    const restaurant = await Restaurant.create({
      name: restaurantName,
      city: restaurantCity,
      cuisine: restaurantCuisine,
      phone: restaurantPhone,
      address: restaurantAddress,
      email: email,
      description: `Welcome to ${restaurantName}!`,
      openingHours: '09:00',
      closingHours: '22:00',
      priceRange: '$$',
    });
    
    // Create user and link to restaurant
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: 'staff',
      restaurantId: restaurant._id,
    });
    
    const token = signJwt({ sub: user.id, email: user.email, role: user.role });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      restaurant: { id: restaurant._id, name: restaurant.name, city: restaurant.city, cuisine: restaurant.cuisine },
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
});

const loginSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(6),
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signJwt({ sub: user.id, email: user.email, role: user.role });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = verifyJwt(token);
    const user = await User.findById(payload.sub).lean();
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
});

authRouter.post('/logout', (_req, res) => {
  // Stateless JWT: client discards token
  res.json({ success: true });
});

const forgotSchema = z.object({
  email: z.string().email(),
});

authRouter.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = forgotSchema.parse(req.body);
    const user = await User.findOne({ email });
    // Respond 200 always for privacy, but only send email if user exists
    if (user) {
      // Generate a temporary password and set it
      const temp = Math.random().toString(36).slice(-10);
      const passwordHash = await bcrypt.hash(temp, 10);
      user.passwordHash = passwordHash;
      await user.save();
      await sendEmail({
        to: user.email,
        subject: 'Your temporary password',
        text: `Hello ${user.name},\n\nYour temporary password is: ${temp}\nPlease log in and change it immediately.`,
      });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});



