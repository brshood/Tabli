import { verifyJwt } from '../utils/jwt';
import { User } from '../models/User';
/**
 * Middleware to verify JWT token and attach user to request
 */
export async function requireAuth(req, res, next) {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const payload = verifyJwt(token);
        const user = await User.findById(payload.sub).lean();
        if (!user) {
            return res.status(401).json({ error: 'Invalid authentication' });
        }
        req.user = {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            restaurantId: user.restaurantId?.toString(),
        };
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
/**
 * Middleware to verify user owns the restaurant they're trying to modify
 */
export function requireOwnRestaurant(req, res, next) {
    // Support both :id and :restaurantId parameter names
    const restaurantId = req.params.id || req.params.restaurantId;
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    // Admins can modify any restaurant
    if (req.user.role === 'admin') {
        return next();
    }
    // Staff can only modify their own restaurant
    if (req.user.restaurantId !== restaurantId) {
        console.log('Access denied - User restaurant:', req.user.restaurantId, 'Requested restaurant:', restaurantId);
        return res.status(403).json({ error: 'Access denied: not your restaurant' });
    }
    next();
}
/**
 * Optional auth - attaches user if token present but doesn't require it
 */
export async function optionalAuth(req, res, next) {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
        if (token) {
            const payload = verifyJwt(token);
            const user = await User.findById(payload.sub).lean();
            if (user) {
                req.user = {
                    id: user._id.toString(),
                    email: user.email,
                    role: user.role,
                    restaurantId: user.restaurantId?.toString(),
                };
            }
        }
    }
    catch {
        // Ignore errors for optional auth
    }
    next();
}
