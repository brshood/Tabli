import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import multer from 'multer';
import { User } from '../models/User.ts';
import { Restaurant } from '../models/Restaurant.ts';
import { signJwt, verifyJwt } from '../utils/jwt.ts';
import { sendEmail } from '../services/email.ts';
import { getGridFsBucket } from '../db/gridfs.ts';
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
        if (existing)
            return res.status(409).json({ error: 'Email already in use' });
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
                        restaurantId: restaurant._id.toString() // Add restaurant ID to metadata
                    }
                });
                // Upload file and wait for completion
                stream.end(req.file.buffer);
                licenseFileRef = await new Promise((resolve, reject) => {
                    stream.on('finish', () => {
                        resolve({
                            fileId: stream.id,
                            type: req.file.mimetype.includes('pdf') ? 'pdf' : 'image',
                            filename: req.file.originalname,
                            contentType: req.file.mimetype,
                            category: 'license',
                            version: 1,
                            uploadedAt: new Date(),
                            isActive: true
                        });
                    });
                    stream.on('error', reject);
                });
                console.log('License file uploaded to GridFS:', licenseFileRef);
                // Update restaurant with file reference
                restaurant.mediaRefs = [licenseFileRef];
                await restaurant.save();
                console.log('Restaurant updated with license file reference');
            }
            catch (uploadError) {
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
            restaurantId: restaurant._id,
        });
        const token = signJwt({ sub: user._id.toString(), email: user.email, role: user.role });
        res.json({
            token,
            user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
            restaurant: {
                id: restaurant._id.toString(),
                name: restaurant.name,
                city: restaurant.city,
                cuisine: restaurant.cuisine,
                licenseUploaded: !!licenseFileRef
            },
        });
    }
    catch (err) {
        if (err.name === 'ZodError') {
            console.error('Signup validation error:', JSON.stringify(err.errors, null, 2));
            // Check if it's a password validation error
            const hasPasswordError = err.errors.some((e) => e.path.includes('password'));
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
        if (!user)
            return res.status(401).json({ error: 'Invalid credentials' });
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok)
            return res.status(401).json({ error: 'Invalid credentials' });
        const token = signJwt({ sub: user._id.toString(), email: user.email, role: user.role });
        res.json({
            token,
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                restaurantId: user.restaurantId?.toString()
            }
        });
    }
    catch (err) {
        next(err);
    }
});
authRouter.get('/me', async (req, res) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const payload = verifyJwt(token);
        const user = await User.findById(payload.sub).lean();
        if (!user)
            return res.status(401).json({ error: 'Unauthorized' });
        res.json({
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                restaurantId: user.restaurantId?.toString()
            }
        });
    }
    catch {
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
    }
    catch (err) {
        next(err);
    }
});
