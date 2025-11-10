import jwt from 'jsonwebtoken'
import type { PublicUser } from '../models/user.model.js'

export interface AuthTokenPayload {
  sub: string
  role?: string
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is required')
  return secret
}

export function signAccessToken(user: PublicUser): string {
  const payload: AuthTokenPayload = { sub: user.id, role: (user as any).role }
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' })
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  return jwt.verify(token, getJwtSecret()) as AuthTokenPayload
}

