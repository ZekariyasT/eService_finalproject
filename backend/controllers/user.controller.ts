import type { Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import type { AuthedRequest } from '../middlewares/auth.middleware.js'
import * as userService from '../services/user.service.js'
import * as userRepo from '../repositories/user.repository.js'
import { ApiError } from '../errors/api-error.js'

export async function me(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.auth!.userId
    const user = await userService.getMe(userId)
    return res.json({ user })
  } catch (err) {
    return next(err)
  }
}

export async function updateProfile(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const schema = z.record(z.any())
    const patch = schema.parse(req.body)
    const userId = req.auth!.userId
    const user = await userService.updateProfile(userId, patch)
    return res.json({ user })
  } catch (err) {
    return next(err)
  }
}

export async function publicProfile(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    const user = await userRepo.findPublicUserById(id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    return res.json({ user })
  } catch (err) {
    return next(err)
  }
}

export async function submitVerification(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const user = await userRepo.updateUserProfile(req.auth!.userId, { verificationStatus: 'submitted' })
    return res.json({ user })
  } catch (err) {
    return next(err)
  }
}

export async function payVerificationBadge(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const user = await userRepo.updateUserProfile(req.auth!.userId, { paidVerificationBadge: true })
    return res.json({ user })
  } catch (err) {
    return next(err)
  }
}

export async function changePassword(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    })
    const body = schema.parse(req.body)
    const userId = req.auth!.userId
    const user = await userRepo.findUserById(userId)
    if (!user) throw new ApiError(404, 'User not found')

    const ok = await bcrypt.compare(body.currentPassword, user.passwordHash)
    if (!ok) throw new ApiError(401, 'Current password is incorrect')

    const newHash = await bcrypt.hash(body.newPassword, 10)
    await userRepo.updatePasswordHash(userId, newHash)
    return res.json({ ok: true })
  } catch (err) {
    return next(err)
  }
}

