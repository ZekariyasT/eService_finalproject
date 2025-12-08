import type { Response, NextFunction } from 'express'
import type { AuthedRequest } from './auth.middleware.js'

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const role = req.auth?.role
  if (role !== 'admin' && role !== 'super-admin') {
    return res.status(403).json({ error: 'Administrator access required' })
  }
  return next()
}

export function requireSuperAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.auth?.role !== 'super-admin') {
    return res.status(403).json({ error: 'Super Admin (founder) access required' })
  }
  return next()
}

export function requireClient(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.auth?.role !== 'client') {
    return res.status(403).json({ error: 'Client account required' })
  }
  return next()
}

export function requireFreelancer(req: AuthedRequest, res: Response, next: NextFunction) {
  const role = req.auth?.role
  if (role !== 'freelancer') {
    return res.status(403).json({ error: 'Freelancer account required' })
  }
  return next()
}

export function requireSeller(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.auth?.role !== 'seller') {
    return res.status(403).json({ error: 'Seller account required' })
  }
  return next()
}
