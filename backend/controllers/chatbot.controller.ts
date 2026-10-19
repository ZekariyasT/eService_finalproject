import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as chatbotService from '../services/chatbot.service.js'
import { env } from '../config/env.js'
import { ApiError } from '../errors/api-error.js'

/**
 * Lightweight in-memory per-IP rate limiter for the public chatbot endpoint.
 * Resets every 60s. This is intentionally simple — Redis can be added later if
 * the API ever runs on multiple instances.
 */
const ipBuckets = new Map<string, { count: number; windowStart: number }>()

function takeRateToken(ip: string): boolean {
  const now = Date.now()
  const limit = env.chatbot.rateLimitPerMinute
  const bucket = ipBuckets.get(ip)
  if (!bucket || now - bucket.windowStart > 60_000) {
    ipBuckets.set(ip, { count: 1, windowStart: now })
    return true
  }
  if (bucket.count >= limit) return false
  bucket.count += 1
  return true
}

const messageSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        text: z.string().min(1).max(4000),
      })
    )
    .max(50)
    .optional(),
  /** When `am`, Gemini is instructed to answer in Amharic (visitor site language). */
  locale: z.enum(['en', 'am']).optional(),
})

export async function message(req: Request, res: Response, next: NextFunction) {
  try {
    const ip = String(req.ip || req.socket.remoteAddress || 'unknown')
    if (!takeRateToken(ip)) {
      throw new ApiError(429, 'Too many messages. Please wait a few seconds and try again.')
    }
    const body = messageSchema.parse(req.body ?? {})
    const result = await chatbotService.chat(body.message, body.history ?? [], {
      locale: body.locale === 'am' ? 'am' : 'en',
    })
    return res.json(result)
  } catch (err) {
    return next(err)
  }
}

export async function status(_req: Request, res: Response, next: NextFunction) {
  try {
    return res.json({
      enabled: Boolean(env.chatbot.apiKey),
      model: env.chatbot.apiKey ? env.chatbot.model : null,
    })
  } catch (err) {
    return next(err)
  }
}
