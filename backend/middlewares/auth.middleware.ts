import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/jwt.js'

export interface AuthedRequest extends Request {
  auth?: { userId: string; role?: string }
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header('authorization') || ''
  const [scheme, token] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return res.status(401).json({ error: 'Missing Bearer token' })
  }
  try {
    const payload = verifyAccessToken(token)
    req.auth = { userId: payload.sub, role: payload.role }
    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

/** Sets `req.auth` when a valid Bearer token is present; otherwise continues without auth. */
export function optionalAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header('authorization') || ''
  const [scheme, token] = header.split(' ')
  if (scheme?.toLowerCase() === 'bearer' && token) {
    try {
      const payload = verifyAccessToken(token)
      req.auth = { userId: payload.sub, role: payload.role }
    } catch {
      /* invalid token — treat as anonymous */
    }
  }
  return next()
}

