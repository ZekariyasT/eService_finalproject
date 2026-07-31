import type { Response, NextFunction } from 'express'
import type { RowDataPacket } from 'mysql2'
import { z } from 'zod'
import type { AuthedRequest } from '../middlewares/auth.middleware.js'
import * as notificationRepo from '../repositories/notification.repository.js'

function mapNotificationRow(r: RowDataPacket) {
  const created = r.created_at
  return {
    id: String(r.id),
    title: String(r.title),
    body: String(r.body),
    type: String(r.type ?? 'system'),
    isRead: Boolean(Number(r.is_read)),
    createdAt: created instanceof Date ? created.toISOString() : String(created),
  }
}

export async function mine(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const rows = await notificationRepo.listMyNotifications(req.auth!.userId)
    const notifications = (rows as RowDataPacket[]).map(mapNotificationRow)
    return res.json({ notifications })
  } catch (e) {
    return next(e)
  }
}

export async function unreadCount(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const unreadCount = await notificationRepo.countUnread(req.auth!.userId)
    return res.json({ unreadCount })
  } catch (e) {
    return next(e)
  }
}

export async function markRead(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    await notificationRepo.markRead(req.auth!.userId, id)
    return res.json({ ok: true })
  } catch (e) {
    return next(e)
  }
}

export async function markAllRead(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    await notificationRepo.markAllRead(req.auth!.userId)
    return res.json({ ok: true })
  } catch (e) {
    return next(e)
  }
}

