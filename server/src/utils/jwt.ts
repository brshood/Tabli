import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
}

export function signJwt(payload: JwtPayload, expiresIn: string | number = '7d'): string {
  const options: SignOptions = { expiresIn: expiresIn as any };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}



