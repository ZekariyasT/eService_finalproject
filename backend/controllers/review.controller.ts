import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import type { AuthedRequest } from '../middlewares/auth.middleware.js'
import * as reviewRepo from '../repositories/review.repository.js'
import * as userRepo from '../repositories/user.repository.js'
import * as notificationRepo from '../repositories/notification.repository.js'

export async function create(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      targetUserId: z.string().min(1),
      serviceOrderId: z.string().optional().nullable(),
      rating: z.number().min(1).max(5),
      comment: z.string().min(1).max(2000),
    })
    const body = schema.parse(req.body)
    const reviewerId = req.auth!.userId
    const rev = await reviewRepo.createReview({
      reviewerId,
      targetUserId: body.targetUserId,
      serviceOrderId: body.serviceOrderId,
      rating: body.rating,
      comment: body.comment,
    })
    const reviewer = await userRepo.findUserById(reviewerId)
    await notificationRepo
      .createNotification(
        body.targetUserId,
        'New review received',
        `${reviewer?.name ?? 'Someone'} left ${body.rating}★ feedback.`,
        'review'
      )
      .catch(() => {})
    return res.status(201).json({ review: rev })
  } catch (e) {
    return next(e)
  }
}

export async function listForUser(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = z.string().min(1).parse(req.params.userId)
    const list = await reviewRepo.listReviewsForUser(userId)
    return res.json({ reviews: list })
  } catch (e) {
    return next(e)
  }
}
