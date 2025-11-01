import jwt from 'jsonwebtoken';
import { env } from '../config/env.ts';
export function signJwt(payload, expiresIn = '7d') {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
}
export function verifyJwt(token) {
    return jwt.verify(token, env.JWT_SECRET);
}
