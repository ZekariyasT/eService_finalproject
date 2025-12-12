const TOKEN_KEY = 'elite_auth_token'

export function getApiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
  return base.replace(/\/$/, '')
}

/** Backend OAuth routes live outside `/api` — same host as getApiBase(). */
export function getGoogleOAuthStartUrl(
  mode: 'login' | 'signup',
  role?: 'freelancer' | 'client' | 'seller'
): string {
  const base = getApiBase()
  const params = new URLSearchParams({ mode })
  if (mode === 'signup' && role) params.set('role', role)
  return `${base}/auth/google/start?${params.toString()}`
}

/** Shown when fetch fails (e.g. ERR_CONNECTION_REFUSED) — API not running or wrong port. */
export function apiUnreachableMessage(): string {
  const base = getApiBase()
  return `Cannot reach the API at ${base}. The Next.js app and the API are separate: run "npm run dev" in the backend folder, then open ${base}/api/health (should show ok). If the backend exits immediately, fix MySQL in backend/.env. Google sign-in also needs that same server.`
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string | null): void {
  if (typeof window === 'undefined') return
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

const DEFAULT_API_TIMEOUT_MS = 25_000

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { json?: unknown; timeoutMs?: number }
): Promise<T> {
  const base = getApiBase()
  const headers = new Headers(init?.headers)
  const token = getStoredToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let body: BodyInit | null | undefined = init?.body
  if (init && 'json' in init && init.json !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(init.json)
  }

  const timeoutMs = init?.timeoutMs ?? DEFAULT_API_TIMEOUT_MS
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  const upstream = init?.signal
  const onUpstreamAbort = () => controller.abort()
  if (upstream) {
    if (upstream.aborted) controller.abort()
    else upstream.addEventListener('abort', onUpstreamAbort)
  }

  const { json: _json, timeoutMs: _timeoutMs, ...fetchInit } = init ?? {}

  let res: Response
  try {
    res = await fetch(`${base}/api${path}`, {
      ...fetchInit,
      signal: controller.signal,
      headers,
      body: body ?? null,
    })
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(
        `Request timed out after ${Math.round(timeoutMs / 1000)}s. Is the API running at ${base}?`
      )
    }
    const isNet =
      e instanceof TypeError ||
      (e instanceof Error && /failed to fetch|network|load failed|aborted/i.test(e.message))
    if (isNet) throw new Error(apiUnreachableMessage())
    throw e
  } finally {
    clearTimeout(timeoutId)
    if (upstream) upstream.removeEventListener('abort', onUpstreamAbort)
  }

  const data = (await res.json().catch(() => ({}))) as T & { error?: string; details?: unknown }
  if (!res.ok) {
    const msg = (data as { error?: string }).error || res.statusText || 'Request failed'
    const err = new Error(msg) as Error & { status?: number; details?: unknown }
    err.status = res.status
    if ((data as { details?: unknown }).details) err.details = (data as { details?: unknown }).details
    throw err
  }
  return data as T
}

export type ServiceSearchParams = {
  q?: string
  scope?: 'all' | 'freelancer' | 'service'
  serviceCategory?: string
  maxPrice?: string
  maxDeliveryDays?: string
  minRating?: string
  location?: string
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'rating_desc' | 'delivery_asc'
  page?: number
  limit?: number
}

export async function fetchServices<T>(params: ServiceSearchParams): Promise<T> {
  const qs = new URLSearchParams()
  if (params.q?.trim()) qs.set('q', params.q.trim())
  if (params.scope) qs.set('scope', params.scope)
  if (params.serviceCategory?.trim()) qs.set('serviceCategory', params.serviceCategory.trim())
  if (params.maxPrice?.trim()) qs.set('maxPrice', params.maxPrice.trim())
  if (params.maxDeliveryDays?.trim()) qs.set('maxDeliveryDays', params.maxDeliveryDays.trim())
  if (params.minRating?.trim()) qs.set('minRating', params.minRating.trim())
  if (params.location?.trim()) qs.set('location', params.location.trim())
  if (params.sort) qs.set('sort', params.sort)
  if (params.page && params.page > 0) qs.set('page', String(params.page))
  if (params.limit && params.limit > 0) qs.set('limit', String(params.limit))
  const suffix = qs.toString()
  return apiFetch<T>(suffix ? `/services?${suffix}` : '/services')
}

/** Upload full-course file for a digital product (seller). Field name must be `file`. */
export async function uploadDigitalProductFullCourse(productId: string, file: File): Promise<void> {
  const base = getApiBase()
  const token = getStoredToken()
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${base}/api/products/${encodeURIComponent(productId)}/full-course-upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) {
    throw new Error(data.error || res.statusText || 'Upload failed')
  }
}

/** Download hosted full-course file (buyer or creator). Streams attachment with auth. */
export async function downloadDigitalProductFullCourse(productId: string): Promise<void> {
  const base = getApiBase()
  const token = getStoredToken()
  const res = await fetch(`${base}/api/downloads/digital-products/${encodeURIComponent(productId)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (res.status === 400) {
    const data = (await res.json().catch(() => ({}))) as { error?: string; externalUrl?: string }
    if (data.externalUrl) {
      window.open(data.externalUrl, '_blank', 'noopener,noreferrer')
      return
    }
    throw new Error(data.error || 'Download failed')
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error || res.statusText || 'Download failed')
  }
  const cd = res.headers.get('Content-Disposition')
  let filename = 'course-download'
  const m = cd?.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i)
  if (m?.[1]) {
    try {
      filename = decodeURIComponent(m[1].trim())
    } catch {
      filename = m[1].trim()
    }
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Send chat message (JSON or multipart if `file` is set). Requires non-empty text unless `file` is provided. */
export async function sendChatMessage(
  receiverId: string,
  body: string,
  file?: File | null
): Promise<{ message: Record<string, unknown> }> {
  const base = getApiBase()
  const token = getStoredToken()
  if (file) {
    const fd = new FormData()
    fd.append('receiverId', receiverId)
    fd.append('body', body)
    fd.append('file', file)
    const res = await fetch(`${base}/api/messages`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    })
    const data = (await res.json().catch(() => ({}))) as { error?: string; message?: Record<string, unknown> }
    if (!res.ok) throw new Error(data.error || res.statusText || 'Send failed')
    return data as { message: Record<string, unknown> }
  }
  const trimmed = body.trim()
  if (!trimmed) throw new Error('Enter a message or attach a file.')
  return apiFetch<{ message: Record<string, unknown> }>('/messages', {
    method: 'POST',
    json: { receiverId, body },
  })
}

/** Fetch attachment bytes (for inline preview). Participant only. */
export async function fetchMessageAttachmentBlob(messageId: string): Promise<Blob> {
  const base = getApiBase()
  const token = getStoredToken()
  const res = await fetch(`${base}/api/messages/${encodeURIComponent(messageId)}/attachment`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error || res.statusText || 'Could not load file')
  }
  return res.blob()
}

/** Save attachment to disk. Optional `fileLabel` is used as the download filename when set. */
export async function downloadMessageAttachment(messageId: string, fileLabel?: string | null): Promise<void> {
  const blob = await fetchMessageAttachmentBlob(messageId)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileLabel?.trim() || 'download'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
