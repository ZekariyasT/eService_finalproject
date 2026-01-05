import { env } from '../config/env.js'

export async function exchangeAuthorizationCode(code: string): Promise<{ access_token: string }> {
  const body = new URLSearchParams({
    code,
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
    redirect_uri: env.googleRedirectUri,
    grant_type: 'authorization_code',
  })
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    throw new Error(
      'Google could not exchange the sign-in code. Check GOOGLE_REDIRECT_URI matches your Google Cloud OAuth client (e.g. http://localhost:4000/auth/google/callback).'
    )
  }
  const json = (await res.json()) as { access_token?: string }
  if (!json.access_token) throw new Error('Google did not return an access token.')
  return { access_token: json.access_token }
}

export async function fetchGoogleUserProfile(accessToken: string): Promise<{
  id: string
  email: string
  name?: string
  picture?: string
}> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Could not load your Google profile.')
  const json = (await res.json()) as { id: string; email: string; name?: string; picture?: string }
  if (!json.id || !json.email) throw new Error('Google did not return email or account id.')
  return json
}
