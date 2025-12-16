import bcrypt from 'bcryptjs'
import { randomBytes, randomUUID } from 'node:crypto'
import * as userRepo from '../repositories/user.repository.js'
import * as passwordResetRepo from '../repositories/password-reset.repository.js'
import * as emailVerifyRepo from '../repositories/email-verification.repository.js'
import * as notificationRepo from '../repositories/notification.repository.js'
import * as telebirrService from './telebirr.service.js'
import { sendPasswordResetEmail, sendSignupVerificationEmail } from './mail.service.js'
import { env } from '../config/env.js'
import type { PublicUser, User, UserRole } from '../models/user.model.js'
import { ApiError } from '../errors/api-error.js'
import { signAccessToken } from '../utils/jwt.js'

function toPublicUser(u: User): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...rest } = u as any
  return rest as PublicUser
}

async function issueEmailVerification(userId: string, email: string): Promise<{ debugVerificationLink?: string }> {
  const plainToken = randomBytes(32).toString('base64url')
  const tokenHash = emailVerifyRepo.hashEmailVerificationToken(plainToken)
  const expiresAt = new Date(Date.now() + env.emailVerificationExpiryMinutes * 60_000)
  await emailVerifyRepo.deleteVerificationTokensForUser(userId)
  await emailVerifyRepo.insertVerificationToken(userId, tokenHash, expiresAt)
  const verifyPath = `/auth/verify-email?token=${encodeURIComponent(plainToken)}`
  const verifyUrl = `${env.clientOrigin.replace(/\/$/, '')}${verifyPath}`
  const sent = await sendSignupVerificationEmail(email, verifyUrl).catch(() => false)
  if (!sent && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(`[email-verify] SMTP not configured — verification link for ${email}:\n${verifyUrl}`)
  }
  const out: { debugVerificationLink?: string } = {}
  if (!sent && process.env.NODE_ENV !== 'production') {
    out.debugVerificationLink = verifyUrl
  }
  return out
}

export async function login(email: string, password: string): Promise<{ user: PublicUser; token: string }> {
  const user = await userRepo.findUserByEmail(email)
  if (!user) throw new ApiError(401, 'Invalid credentials')

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) throw new ApiError(401, 'Invalid credentials')

  if (!user.isActive) {
    throw new ApiError(403, 'This account has been suspended. Contact support if you believe this is an error.')
  }

  if (env.requireEmailVerificationForLogin && !user.verified) {
    throw new ApiError(
      403,
      'Verify your email before signing in. Open the link we sent you, or request a new one from the check-email page after sign-up.'
    )
  }

  const publicUser = toPublicUser(user)
  return { user: publicUser, token: signAccessToken(publicUser) }
}

export async function signup(input: {
  role: Extract<UserRole, 'client' | 'freelancer' | 'seller'>
  name: string
  username?: string
  email: string
  password: string
  phone?: string
  company?: string
  industry?: string
  skills?: string[]
}): Promise<{ user: PublicUser; token: string; message: string; debugVerificationLink?: string }> {
  const exists = await userRepo.findUserByEmail(input.email)
  if (exists) throw new ApiError(409, 'Email already in use')

  const passwordHash = await bcrypt.hash(input.password, 10)
  const now = new Date().toISOString()
  const id = randomUUID()

  const base = {
    id,
    username: input.username,
    email: input.email,
    name: input.name,
    role: input.role as UserRole,
    verified: false,
    createdAt: now,
    passwordHash,
    phone: input.phone,
    isActive: true,
    personalProfile: {},
    onboardingProfileStatus: 'pending' as const,
  }

  const newUser: User =
    input.role === 'freelancer'
      ? ({
          ...base,
          role: 'freelancer',
          bio: '',
          skills: input.skills || [],
          hourlyRate: 0,
          rating: 0,
          completedProjects: 0,
          earnings: 0,
          location: '',
          profileComplete: 30,
        } satisfies User)
      : input.role === 'client'
      ? ({
          ...base,
          role: 'client',
          company: input.company || '',
          industry: input.industry || '',
          location: '',
          verifiedPayment: false,
        } satisfies User)
      : ({
          ...base,
          role: input.role,
        } satisfies User)

  await userRepo.insertUser(newUser as User & { passwordHash: string })

  await notificationRepo
    .createNotification(
      id,
      'Welcome to Elite Ethiopia',
      `Hi ${input.name}, your account is ready. Open your dashboard to get started.`,
      'welcome'
    )
    .catch(() => {})

  // Auto-provision a mock Telebirr account if a phone number was provided.
  // Default PIN 1234, starting balance 5000 Br — for MVP demos.
  if (input.phone) {
    await telebirrService
      .ensureAccount({ userId: id, phoneNumber: input.phone, holderName: input.name })
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.warn('[telebirr] ensureAccount on signup failed:', err)
      })
  }

  let debugVerificationLink: string | undefined
  try {
    const v = await issueEmailVerification(id, input.email)
    debugVerificationLink = v.debugVerificationLink
  } catch {
    /* email issuance must not fail signup */
  }

  const publicUser = toPublicUser(newUser)
  return {
    user: publicUser,
    token: signAccessToken(publicUser),
    message: 'Account created. Check your email to verify your address.',
    ...(debugVerificationLink ? { debugVerificationLink } : {}),
  }
}

export type GoogleOAuthResult =
  | { kind: 'session'; user: PublicUser; token: string }
  | {
      kind: 'pick_role'
      googleSub: string
      email: string
      name: string
      picture?: string
    }

async function createUserViaGoogleProfile(input: {
  googleSub: string
  email: string
  name: string
  picture?: string
  role: Extract<UserRole, 'client' | 'freelancer' | 'seller'>
  /** When set (e.g. finish-account flow), user can sign in with email + password as well as Google. */
  passwordPlain?: string
}): Promise<{ user: PublicUser; token: string }> {
  const email = input.email.trim().toLowerCase()

  let passwordHash: string
  if (input.passwordPlain !== undefined && input.passwordPlain.length > 0) {
    if (input.passwordPlain.length < 6) {
      throw new ApiError(400, 'Password must be at least 6 characters.')
    }
    passwordHash = await bcrypt.hash(input.passwordPlain, 10)
  } else {
    passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 10)
  }
  const now = new Date().toISOString()
  const id = randomUUID()
  const role = input.role

  const base = {
    id,
    username: undefined as string | undefined,
    email,
    name: input.name || email.split('@')[0]!,
    role: role as UserRole,
    verified: true,
    createdAt: now,
    passwordHash,
    phone: undefined as string | undefined,
    isActive: true,
    personalProfile: {},
    onboardingProfileStatus: 'pending' as const,
  }

  const newUser: User =
    role === 'freelancer'
      ? ({
          ...base,
          role: 'freelancer',
          bio: '',
          skills: [],
          hourlyRate: 0,
          rating: 0,
          completedProjects: 0,
          earnings: 0,
          location: '',
          profileComplete: 30,
        } satisfies User)
      : role === 'client'
        ? ({
            ...base,
            role: 'client',
            company: '—',
            industry: 'other',
            location: '',
            verifiedPayment: false,
          } satisfies User)
        : ({
            ...base,
            role: 'seller',
          } satisfies User)

  await userRepo.insertUser(
    { ...(newUser as object), passwordHash, googleId: input.googleSub } as User & {
      passwordHash: string
      googleId: string
    }
  )

  await notificationRepo
    .createNotification(
      id,
      'Welcome to Elite Ethiopia',
      `Hi ${base.name}, your account is ready. Open your dashboard to get started.`,
      'welcome'
    )
    .catch(() => {})

  await notificationRepo
    .createNotification(
      id,
      'Finish your account',
      'Add your profile details and preferences so clients and collaborators can find you. Tap to open your profile.',
      'complete_profile'
    )
    .catch(() => {})

  if (input.picture) {
    await userRepo.updateUserProfile(id, { profilePictureUrl: input.picture }).catch(() => {})
  }

  const created = await userRepo.findUserById(id)
  if (!created) throw new ApiError(500, 'Account was created but could not be loaded.')
  const pub = toPublicUser(created)
  return { user: pub, token: signAccessToken(pub) }
}

export async function googleOAuth(input: {
  googleSub: string
  email: string
  name: string
  picture?: string
  mode: 'login' | 'signup'
  role?: Extract<UserRole, 'client' | 'freelancer' | 'seller'>
}): Promise<GoogleOAuthResult> {
  const email = input.email.trim().toLowerCase()

  let user = await userRepo.findUserByGoogleId(input.googleSub)
  if (user) {
    if (!user.isActive) {
      throw new ApiError(403, 'This account has been suspended. Contact support if you believe this is an error.')
    }
    const pub = toPublicUser(user)
    return { kind: 'session', user: pub, token: signAccessToken(pub) }
  }

  const byEmail = await userRepo.findUserByEmail(email)
  if (byEmail) {
    if (input.mode === 'signup') {
      throw new ApiError(
        409,
        'An account with this email already exists. Open the login page and use Continue with Google there to sign in without your password.'
      )
    }
    await userRepo.setGoogleId(byEmail.id, input.googleSub)
    const patch: Record<string, unknown> = {}
    if (input.picture) patch.profilePictureUrl = input.picture
    if (Object.keys(patch).length) await userRepo.updateUserProfile(byEmail.id, patch)
    user = await userRepo.findUserById(byEmail.id)
    if (!user) throw new ApiError(500, 'Could not load account after linking Google.')
    if (!user.isActive) {
      throw new ApiError(403, 'This account has been suspended. Contact support if you believe this is an error.')
    }
    const pub = toPublicUser(user)
    return { kind: 'session', user: pub, token: signAccessToken(pub) }
  }

  if (input.mode === 'login') {
    return {
      kind: 'pick_role',
      googleSub: input.googleSub,
      email,
      name: input.name || email.split('@')[0]!,
      picture: input.picture,
    }
  }

  const role = input.role
  if (!role || !['client', 'freelancer', 'seller'].includes(role)) {
    throw new ApiError(400, 'Choose client, freelancer, or seller on the sign-up page before continuing with Google.')
  }

  const session = await createUserViaGoogleProfile({
    googleSub: input.googleSub,
    email,
    name: input.name || email.split('@')[0]!,
    picture: input.picture,
    role,
  })
  return { kind: 'session', ...session }
}

/** Finish signup after Google login when no account existed — verifies profile matches pending token. */
export async function completeGoogleSignupFromPending(input: {
  googleSub: string
  email: string
  name: string
  picture?: string
  role: Extract<UserRole, 'client' | 'freelancer' | 'seller'>
  /** Optional: use Google-only sign-in; omit or leave empty to skip email/password login. */
  password: string
}): Promise<{ user: PublicUser; token: string }> {
  const email = input.email.trim().toLowerCase()
  const password = typeof input.password === 'string' ? input.password.trim() : ''

  let user = await userRepo.findUserByGoogleId(input.googleSub)
  if (user) {
    if (!user.isActive) {
      throw new ApiError(403, 'This account has been suspended. Contact support if you believe this is an error.')
    }
    const pub = toPublicUser(user)
    return { user: pub, token: signAccessToken(pub) }
  }

  const byEmail = await userRepo.findUserByEmail(email)
  if (byEmail) {
    await userRepo.setGoogleId(byEmail.id, input.googleSub)
    const patch: Record<string, unknown> = {}
    if (input.picture) patch.profilePictureUrl = input.picture
    if (Object.keys(patch).length) await userRepo.updateUserProfile(byEmail.id, patch)
    user = await userRepo.findUserById(byEmail.id)
    if (!user) throw new ApiError(500, 'Could not load account after linking Google.')
    if (!user.isActive) {
      throw new ApiError(403, 'This account has been suspended. Contact support if you believe this is an error.')
    }
    const pub = toPublicUser(user)
    return { user: pub, token: signAccessToken(pub) }
  }

  const passwordPlain = password.length >= 6 ? password : undefined

  return createUserViaGoogleProfile({
    googleSub: input.googleSub,
    email,
    name: input.name || email.split('@')[0]!,
    picture: input.picture,
    role: input.role,
    ...(passwordPlain !== undefined ? { passwordPlain } : {}),
  })
}

const PUBLIC_RESEND_VERIFICATION_ACK =
  'If an account exists and still needs email verification, we sent a new message.'

export async function verifyEmailWithToken(plainToken: string): Promise<{ message: string }> {
  const tokenHash = emailVerifyRepo.hashEmailVerificationToken(plainToken.trim())
  const row = await emailVerifyRepo.consumeVerificationToken(tokenHash)
  if (!row) {
    throw new ApiError(400, 'This verification link is invalid or has expired. Request a new one from the sign-up flow.')
  }
  await userRepo.updateUserProfile(row.userId, { verified: true })
  return { message: 'Your email has been verified.' }
}

export async function requestResendVerificationEmail(emailRaw: string): Promise<{
  message: string
  debugVerificationLink?: string
}> {
  const email = emailRaw.trim().toLowerCase()
  const user = await userRepo.findUserByEmail(email)
  if (!user || !user.isActive || user.verified) {
    return { message: PUBLIC_RESEND_VERIFICATION_ACK }
  }
  try {
    const v = await issueEmailVerification(user.id, user.email)
    return {
      message: PUBLIC_RESEND_VERIFICATION_ACK,
      ...(v.debugVerificationLink ? { debugVerificationLink: v.debugVerificationLink } : {}),
    }
  } catch {
    return { message: PUBLIC_RESEND_VERIFICATION_ACK }
  }
}

const PUBLIC_RESET_ACK =
  'If an account exists for that email, we sent instructions to reset your password.'

export async function requestPasswordReset(emailRaw: string): Promise<{
  message: string
  debugResetLink?: string
}> {
  const email = emailRaw.trim().toLowerCase()
  const user = await userRepo.findUserByEmail(email)
  if (!user || !user.isActive) {
    return { message: PUBLIC_RESET_ACK }
  }

  const plainToken = randomBytes(32).toString('base64url')
  const tokenHash = passwordResetRepo.hashPasswordResetToken(plainToken)
  const expiresAt = new Date(Date.now() + env.passwordResetExpiryMinutes * 60_000)

  await passwordResetRepo.deleteTokensForUser(user.id)
  await passwordResetRepo.insertToken(user.id, tokenHash, expiresAt)

  const resetPath = `/auth/reset-password?token=${encodeURIComponent(plainToken)}`
  const resetUrl = `${env.clientOrigin.replace(/\/$/, '')}${resetPath}`

  const sent = await sendPasswordResetEmail(user.email, resetUrl).catch(() => false)
  if (!sent && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(`[password-reset] SMTP not configured — reset link for ${email}:\n${resetUrl}`)
  }

  const out: { message: string; debugResetLink?: string } = { message: PUBLIC_RESET_ACK }
  if (!sent && process.env.NODE_ENV !== 'production') {
    out.debugResetLink = resetUrl
  }
  return out
}

export async function resetPasswordWithToken(
  plainToken: string,
  newPassword: string
): Promise<{ message: string }> {
  if (newPassword.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters.')
  }
  const tokenHash = passwordResetRepo.hashPasswordResetToken(plainToken.trim())
  const row = await passwordResetRepo.consumeTokenRow(tokenHash)
  if (!row) {
    throw new ApiError(400, 'This reset link is invalid or has expired. Request a new one from the login page.')
  }
  const passwordHash = await bcrypt.hash(newPassword, 10)
  await userRepo.updatePasswordHash(row.userId, passwordHash)
  return { message: 'Your password has been updated. You can sign in now.' }
}
