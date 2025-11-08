import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import multer from 'multer';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { signJwt, verifyJwt } from '../utils/jwt';
import { sendEmail } from '../services/email';
import { getGridFsBucket } from '../db/gridfs';
import { buildPasswordResetOtpTemplate } from '../services/emailTemplates';

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

export const authRouter = express.Router();

// Password requirements constant (exported for frontend)
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  description: [
    'At least 8 characters long',
    'At least one uppercase letter (A-Z)',
    'At least one number (0-9)',
    'At least one special character (!@#$%^&*)'
  ]
};

// Strong password: 8+ chars, 1 uppercase, 1 number, 1 special char
const passwordSchema = z.string()
  .min(PASSWORD_REQUIREMENTS.minLength, `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`)
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

// GET /auth/password-requirements - Returns password requirements
authRouter.get('/password-requirements', (req, res) => {
  res.json(PASSWORD_REQUIREMENTS);
});

authRouter.post('/signup', upload.single('licenseFile'), async (req, res, next) => {
  try {
    const parsed = signupSchema.parse(req.body);
    const { name, email, password, restaurantName, restaurantCity, restaurantCuisine, restaurantPhone, restaurantAddress } = parsed;
    
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already in use' });
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create restaurant first (without file reference)
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
      mediaRefs: []
    });
    
    // Upload license file to GridFS if provided (now we have restaurant ID)
    let licenseFileRef = null;
    if (req.file) {
      try {
        const bucket = getGridFsBucket();
        const stream = bucket.openUploadStream(req.file.originalname, {
          contentType: req.file.mimetype,
          metadata: { 
            type: 'license', 
            restaurantName: restaurantName,
            restaurantId: (restaurant._id as any).toString() // Add restaurant ID to metadata
          }
        });
        
        // Upload file and wait for completion
        stream.end(req.file.buffer);
        
        licenseFileRef = await new Promise((resolve, reject) => {
          stream.on('finish', () => {
            resolve({
              fileId: stream.id as any,
              type: req.file!.mimetype.includes('pdf') ? 'pdf' : 'image',
              filename: req.file!.originalname,
              contentType: req.file!.mimetype,
              category: 'license' as any,
              version: 1,
              uploadedAt: new Date(),
              isActive: true
            } as any);
          });
          stream.on('error', reject);
        });
        
        console.log('License file uploaded to GridFS:', licenseFileRef);
        
        // Update restaurant with file reference
        restaurant.mediaRefs = [licenseFileRef as any];
        await restaurant.save();
        console.log('Restaurant updated with license file reference');
      } catch (uploadError: any) {
        console.error('Error uploading license file:', uploadError?.message || 'Unknown error', uploadError?.stack);
        // Continue even if file upload fails - restaurant is already created
      }
    }
    
    // Create user and link to restaurant
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: 'staff',
      restaurantId: restaurant._id as any,
    });
    
    const token = signJwt({ sub: (user._id as any).toString(), email: user.email, role: user.role });
    res.json({
      token,
      user: { id: (user._id as any).toString(), name: user.name, email: user.email, role: user.role },
      restaurant: { 
        id: (restaurant._id as any).toString(), 
        name: restaurant.name, 
        city: restaurant.city, 
        cuisine: restaurant.cuisine,
        licenseUploaded: !!licenseFileRef 
      },
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      console.error('Signup validation error:', JSON.stringify(err.errors, null, 2));
      // Check if it's a password validation error
      const hasPasswordError = err.errors.some((e: any) => e.path.includes('password'));
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: err.errors,
        ...(hasPasswordError && { passwordRequirements: PASSWORD_REQUIREMENTS })
      });
    }
    if (err.code === 11000) {
      console.error('Signup error: Email already in use');
      return res.status(409).json({ error: 'Email already in use' });
    }
    console.error('Signup error:', err?.message || 'Unknown error', err?.stack);
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
    const token = signJwt({ sub: (user._id as any).toString(), email: user.email, role: user.role });
    res.json({ 
      token, 
      user: { 
        id: (user._id as any).toString(), 
        name: user.name, 
        email: user.email, 
        role: user.role,
        restaurantId: user.restaurantId?.toString()
      } 
    });
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
    res.json({ 
      user: { 
        id: (user._id as any).toString(), 
        name: user.name, 
        email: user.email, 
        role: user.role,
        restaurantId: user.restaurantId?.toString()
      } 
    });
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

const resetSchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit code'),
  password: passwordSchema,
});

authRouter.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = forgotSchema.parse(req.body);
    const user = await User.findOne({ email });
    // Respond 200 always for privacy, but only send email if user exists
    if (user) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = await bcrypt.hash(otp, 10);
      const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      user.resetToken = null;
      user.resetTokenExpiresAt = null;
      user.resetOtp = otpHash;
      user.resetOtpExpiresAt = expires;
      await user.save();

      const { subject, text, html } = buildPasswordResetOtpTemplate({
        name: user.name,
        otp,
      });

      await sendEmail({
        to: user.email,
        subject,
        text,
        html,
      });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/reset-password', async (req, res, next) => {
  try {
    const { email, otp, password } = resetSchema.parse(req.body);
    const user = await User.findOne({ email });

    if (!user || !user.resetOtp || !user.resetOtpExpiresAt) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    const safeUser = user!;

    const expiresAt = new Date(safeUser.resetOtpExpiresAt!);
    if (expiresAt.getTime() < Date.now()) {
      safeUser.resetOtp = null;
      safeUser.resetOtpExpiresAt = null;
      await safeUser.save();
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    const isValid = await bcrypt.compare(otp, safeUser.resetOtp!);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    safeUser.passwordHash = passwordHash;
    safeUser.resetToken = null;
    safeUser.resetTokenExpiresAt = null;
    safeUser.resetOtp = null;
    safeUser.resetOtpExpiresAt = null;

    await safeUser.save();

    const token = signJwt({ sub: (safeUser._id as any).toString(), email: safeUser.email, role: safeUser.role });
    res.json({
      token,
      user: {
        id: (safeUser._id as any).toString(),
        name: safeUser.name,
        email: safeUser.email,
        role: safeUser.role,
        restaurantId: safeUser.restaurantId?.toString(),
      },
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: err.errors,
        passwordRequirements: PASSWORD_REQUIREMENTS,
      });
    }
    next(err);
  }
});



