import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as authService from '../services/auth.service.js'

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      email: z.string().trim().pipe(z.string().email()).transform((e) => e.toLowerCase()),
      password: z.string().min(1),
    })
    const body = schema.parse(req.body)
    const result = await authService.login(body.email, body.password)
    return res.json(result)
  } catch (err) {
    return next(err)
  }
}

export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      role: z.enum(['client', 'freelancer', 'seller'] as const),
      name: z.string().min(1),
      username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_.-]+$/).optional(),
      email: z.string().trim().pipe(z.string().email()).transform((e) => e.toLowerCase()),
      password: z.string().min(6),
      phone: z.string().optional(),
      company: z.string().optional(),
      industry: z.string().optional(),
      skills: z.array(z.string()).optional(),
    })
    const body = schema.parse(req.body)
    const result = await authService.signup(body)
    return res.status(201).json(result)
  } catch (err) {
    return next(err)
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      email: z.string().trim().pipe(z.string().email()).transform((e) => e.toLowerCase()),
    })
    const body = schema.parse(req.body)
    const result = await authService.requestPasswordReset(body.email)
    return res.json(result)
  } catch (err) {
    return next(err)
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      token: z.string().min(1),
      password: z.string().min(6),
    })
    const body = schema.parse(req.body)
    const result = await authService.resetPasswordWithToken(body.token, body.password)
    return res.json(result)
  } catch (err) {
    return next(err)
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({ token: z.string().min(1) })
    const body = schema.parse(req.body)
    const result = await authService.verifyEmailWithToken(body.token)
    return res.json(result)
  } catch (err) {
    return next(err)
  }
}

export async function resendVerification(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      email: z.string().trim().pipe(z.string().email()).transform((e) => e.toLowerCase()),
    })
    const body = schema.parse(req.body)
    const result = await authService.requestResendVerificationEmail(body.email)
    return res.json(result)
  } catch (err) {
    return next(err)
  }
}

