import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import * as authService from '../services/auth.service.js'
import { exchangeAuthorizationCode, fetchGoogleUserProfile } from '../services/google-oauth.service.js'
import { ApiError } from '../errors/api-error.js'
import { getJwtSecret } from '../utils/jwt.js'

interface OAuthStatePayload extends jwt.JwtPayload {
  purpose?: string
  mode?: string
  role?: string
}

interface GooglePendingSignupPayload extends jwt.JwtPayload {
  purpose?: string
  googleSub?: string
  email?: string
  name?: string
  picture?: string
}

function redirectWithError(res: Response, message: string) {
  const q = new URLSearchParams({ error: message })
  return res.redirect(`${env.clientOrigin}/auth/google-complete?${q.toString()}`)
}

function redirectWithToken(res: Response, token: string) {
  const q = new URLSearchParams({ token })
  return res.redirect(`${env.clientOrigin}/auth/google-complete?${q.toString()}`)
}

/** GET /auth/google/start?mode=login|signup&role=freelancer|client|seller */
export async function start(req: Request, res: Response) {
  const mode = req.query.mode === 'signup' ? 'signup' : 'login'
  const roleRaw = typeof req.query.role === 'string' ? req.query.role : ''
  const role =
    roleRaw === 'freelancer' || roleRaw === 'client' || roleRaw === 'seller' ? roleRaw : undefined

  if (mode === 'signup' && !role) {
    return redirectWithError(
      res,
      'Open the sign-up page for your role (client, freelancer, or seller), then click Continue with Google from there.'
    )
  }

  if (!env.googleClientId || !env.googleClientSecret) {
    return redirectWithError(
      res,
      'Google sign-in is not configured on the server. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the backend .env file (see env.example).'
    )
  }

  const state = jwt.sign(
    { purpose: 'google_oauth', mode, role: mode === 'signup' ? role : undefined },
    getJwtSecret(),
    { expiresIn: '10m' }
  )

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', env.googleClientId)
  url.searchParams.set('redirect_uri', env.googleRedirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('state', state)
  url.searchParams.set('access_type', 'online')
  url.searchParams.set('prompt', 'select_account')

  return res.redirect(url.toString())
}

/** GET /auth/google/callback — registered as redirect URI in Google Cloud Console */
export async function callback(req: Request, res: Response) {
  const code = typeof req.query.code === 'string' ? req.query.code : ''
  const stateRaw = typeof req.query.state === 'string' ? req.query.state : ''
  const googleErr = typeof req.query.error === 'string' ? req.query.error : ''

  if (googleErr) {
    return redirectWithError(res, `Google sign-in was cancelled or denied (${googleErr}). Try again if you want to continue with Google.`)
  }
  if (!code || !stateRaw) {
    return redirectWithError(res, 'Missing authorization data from Google. Close this tab and try signing in again.')
  }

  let payload: OAuthStatePayload
  try {
    payload = jwt.verify(stateRaw, getJwtSecret()) as OAuthStatePayload
  } catch {
    return redirectWithError(res, 'Your sign-in session expired. Please start again from the login or sign-up page.')
  }
  if (payload.purpose !== 'google_oauth') {
    return redirectWithError(res, 'Invalid sign-in state. Please try again from the app.')
  }

  let accessToken: string
  try {
    const tok = await exchangeAuthorizationCode(code)
    accessToken = tok.access_token
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not complete Google sign-in.'
    return redirectWithError(res, msg)
  }

  let profile: { id: string; email: string; name?: string; picture?: string }
  try {
    profile = await fetchGoogleUserProfile(accessToken)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not read your Google profile.'
    return redirectWithError(res, msg)
  }

  const mode = payload.mode === 'signup' ? 'signup' : 'login'
  const role =
    payload.role === 'freelancer' || payload.role === 'client' || payload.role === 'seller'
      ? payload.role
      : undefined

  try {
    const result = await authService.googleOAuth({
      googleSub: profile.id,
      email: profile.email,
      name: profile.name || profile.email.split('@')[0]!,
      picture: profile.picture,
      mode,
      role: mode === 'signup' ? role : undefined,
    })
    if (result.kind === 'pick_role') {
      const pending = jwt.sign(
        {
          purpose: 'google_pending_signup',
          googleSub: result.googleSub,
          email: result.email,
          name: result.name,
          picture: result.picture,
        },
        getJwtSecret(),
        { expiresIn: '15m' }
      )
      const q = new URLSearchParams({ pending })
      return res.redirect(`${env.clientOrigin}/auth/google-complete?${q.toString()}`)
    }
    return redirectWithToken(res, result.token)
  } catch (e) {
    const msg = e instanceof ApiError ? e.message : 'Could not complete Google sign-in.'
    return redirectWithError(res, msg)
  }
}

export async function completeSignup(req: Request, res: Response, next: NextFunction) {
  try {
    const pendingToken = typeof req.body?.pendingToken === 'string' ? req.body.pendingToken : ''
    const role = req.body?.role
    if (!pendingToken) {
      throw new ApiError(400, 'Missing pending token. Start Google sign-in again.')
    }
    let payload: GooglePendingSignupPayload
    try {
      payload = jwt.verify(pendingToken, getJwtSecret()) as GooglePendingSignupPayload
    } catch {
      throw new ApiError(
        400,
        'Your session expired. Return to login and try Continue with Google again.'
      )
    }
    if (payload.purpose !== 'google_pending_signup') {
      throw new ApiError(400, 'Invalid sign-in token.')
    }
    const googleSub = typeof payload.googleSub === 'string' ? payload.googleSub : ''
    const email = typeof payload.email === 'string' ? payload.email : ''
    const name = typeof payload.name === 'string' ? payload.name : ''
    const picture = typeof payload.picture === 'string' ? payload.picture : undefined
    if (!googleSub || !email) {
      throw new ApiError(400, 'Invalid sign-in data. Try again.')
    }
    if (role !== 'client' && role !== 'freelancer' && role !== 'seller') {
      throw new ApiError(400, 'Choose client, freelancer, or seller.')
    }
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    const out = await authService.completeGoogleSignupFromPending({
      googleSub,
      email,
      name,
      picture,
      role,
      password,
    })
    return res.json(out)
  } catch (e) {
    next(e)
  }
}
