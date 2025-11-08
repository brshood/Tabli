import jwt from 'jsonwebtoken';
import { env } from '../config/env';
export function signJwt(payload, expiresIn = '7d') {
    const options = { expiresIn: expiresIn };
    return jwt.sign(payload, env.JWT_SECRET, options);
}
export function verifyJwt(token) {
    return jwt.verify(token, env.JWT_SECRET);
}
