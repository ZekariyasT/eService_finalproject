import { NextResponse } from 'next/server'
import { z } from 'zod'

const bodySchema = z.object({
  texts: z.array(z.string().max(5000)).min(1).max(128),
  target: z.literal('am'),
})

type GoogleTranslateResponse = {
  data?: {
    translations?: Array<{ translatedText?: string }>
  }
  error?: { message?: string }
}

export async function POST(req: Request) {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY
  if (!key?.trim()) {
    return NextResponse.json(
      { error: 'GOOGLE_TRANSLATE_API_KEY is not configured' },
      { status: 503 },
    )
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { texts, target } = parsed.data
  const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: texts,
      target,
      source: 'en',
      format: 'text',
    }),
  })

  const raw = (await r.json()) as GoogleTranslateResponse

  if (!r.ok) {
    const msg = raw.error?.message ?? r.statusText
    console.error('[translate]', r.status, msg)
    return NextResponse.json({ error: 'Translation service error' }, { status: 502 })
  }

  const list = raw.data?.translations ?? []
  const translations = texts.map((_, i) => list[i]?.translatedText ?? texts[i])

  return NextResponse.json({ translations })
}
