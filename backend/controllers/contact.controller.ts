import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import type { AuthedRequest } from '../middlewares/auth.middleware.js'
import * as contactRepo from '../repositories/contact-submission.repository.js'
import * as notificationRepo from '../repositories/notification.repository.js'
import * as userRepo from '../repositories/user.repository.js'
import { ApiError } from '../errors/api-error.js'

const submitSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z
    .string()
    .trim()
    .email()
    .max(255)
    .transform((e: string) => e.toLowerCase()),
  subject: z.string().trim().min(1).max(500),
  message: z.string().trim().min(1).max(8000),
})

/** Public: website contact form → stored for admins + optional in-app notification. */
export async function submit(req: Request, res: Response, next: NextFunction) {
  try {
    const body = submitSchema.parse(req.body)
    const { id } = await contactRepo.createSubmission(body)

    const admins = await userRepo.findAdminUserIds()
    if (admins.length) {
      const preview =
        body.subject.length > 120 ? `${body.subject.slice(0, 117)}…` : body.subject
      await notificationRepo
        .createNotificationsBulk(
          admins.map((userId) => ({
            userId,
            title: 'New contact form message',
            body: `${body.name} (${body.email}): ${preview}`,
            type: 'contact',
          }))
        )
        .catch(() => {})
    }

    return res.status(201).json({ ok: true, id })
  } catch (err) {
    return next(err)
  }
}

export async function listForAdmin(_req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const list = await contactRepo.listSubmissionsForAdmin()
    return res.json({ submissions: list })
  } catch (e) {
    return next(e)
  }
}

export async function markRead(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    const ok = await contactRepo.markRead(id)
    if (!ok) throw new ApiError(404, 'Submission not found')
    return res.json({ ok: true })
  } catch (e) {
    return next(e)
  }
}
