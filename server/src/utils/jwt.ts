import jwt from 'jsonwebtoken';
import { env } from '../config/env.ts';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
}

export function signJwt(payload: JwtPayload, expiresIn: string = '7d'): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}



