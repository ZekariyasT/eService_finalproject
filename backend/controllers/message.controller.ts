import type { Response, NextFunction } from 'express'
import fs from 'node:fs'
import { z } from 'zod'
import type { AuthedRequest } from '../middlewares/auth.middleware.js'
import * as messageRepo from '../repositories/message.repository.js'
import * as userRepo from '../repositories/user.repository.js'
import * as notificationRepo from '../repositories/notification.repository.js'
import { resolveMessagesStoredFileAbsolute, sanitizeOriginalFilename } from '../utils/digital-upload-paths.js'
import { ApiError } from '../errors/api-error.js'

type AuthedWithFile = AuthedRequest & { file?: Express.Multer.File }

export async function peers(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const uid = req.auth!.userId
    const list = await messageRepo.listConversationPeers(uid)
    return res.json({ conversations: list })
  } catch (e) {
    return next(e)
  }
}

export async function thread(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const peerId = z.string().min(1).parse(req.params.peerId)
    const uid = req.auth!.userId
    await messageRepo.markReceivedFromPeerRead(uid, peerId)
    const messages = await messageRepo.listMessagesBetween(uid, peerId)
    return res.json({ messages })
  } catch (e) {
    return next(e)
  }
}

export async function unreadCount(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const uid = req.auth!.userId
    const unreadCount = await messageRepo.countUnreadReceived(uid)
    return res.json({ unreadCount })
  } catch (e) {
    return next(e)
  }
}

export async function send(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const uid = req.auth!.userId
    const r = req as AuthedWithFile
    const file = r.file

    let receiverId: string
    let rawBody: string
    let attachment: { storagePath: string; originalName: string } | undefined

    if (file) {
      receiverId = z.string().min(1).parse(req.body.receiverId)
      rawBody = typeof req.body.body === 'string' ? req.body.body : ''
      attachment = {
        storagePath: `messages/${file.filename}`,
        originalName: sanitizeOriginalFilename(file.originalname),
      }
    } else {
      const schema = z.object({
        receiverId: z.string().min(1),
        body: z.string().min(1).max(8000),
      })
      const body = schema.parse(req.body)
      receiverId = body.receiverId
      rawBody = body.body
    }

    const trimmed = rawBody.trim()
    if (!trimmed && !attachment) {
      throw new ApiError(400, 'Message must include text or a file')
    }

    const bodyStored = trimmed || ''
    const msg = await messageRepo.insertMessage(uid, receiverId, bodyStored, attachment ?? null)

    const sender = await userRepo.findUserById(uid)
    let preview: string
    if (attachment) {
      preview = trimmed
        ? `${trimmed.replace(/\s+/g, ' ').trim().slice(0, 120)} · 📎 ${attachment.originalName}`
        : `📎 ${attachment.originalName}`
    } else {
      preview = trimmed.replace(/\s+/g, ' ').trim().slice(0, 160)
    }

    await notificationRepo
      .createNotification(
        receiverId,
        sender ? `New message from ${sender.name}` : 'New message',
        preview || 'You have a new message.',
        'message'
      )
      .catch(() => {})

    return res.status(201).json({ message: msg })
  } catch (e) {
    return next(e)
  }
}

export async function downloadAttachment(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const messageId = z.string().min(1).parse(req.params.messageId)
    const uid = req.auth!.userId
    const row = await messageRepo.getMessageIfParticipant(messageId, uid)
    if (!row?.attachmentStoragePath) throw new ApiError(404, 'Attachment not found')
    const abs = resolveMessagesStoredFileAbsolute(row.attachmentStoragePath)
    if (!abs || !fs.existsSync(abs)) throw new ApiError(404, 'File no longer available')
    const downloadName = row.attachmentOriginalName || 'attachment'
    res.download(abs, downloadName)
  } catch (e) {
    return next(e)
  }
}
