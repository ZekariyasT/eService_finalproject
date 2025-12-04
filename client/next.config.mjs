import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Next.js only auto-loads `.env*` from `client/`. Many devs put
 * `GOOGLE_TRANSLATE_API_KEY` in `backend/.env` instead — merge it here so
 * `POST /api/translate` works without duplicating the key (restart `next dev` after changes).
 * Production (e.g. Vercel): set `GOOGLE_TRANSLATE_API_KEY` on the frontend project env.
 */
function mergeGoogleTranslateKeyFromBackendEnv() {
  if (process.env.GOOGLE_TRANSLATE_API_KEY?.trim()) return
  const envPath = path.resolve(__dirname, '..', 'backend', '.env')
  let raw
  try {
    raw = fs.readFileSync(envPath, 'utf8')
  } catch {
    return
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    if (key !== 'GOOGLE_TRANSLATE_API_KEY') continue
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    process.env.GOOGLE_TRANSLATE_API_KEY = val
    return
  }
}

mergeGoogleTranslateKeyFromBackendEnv()

/** @type {import('next').NextConfig} */
const nextConfig = {
  /** Hides the bottom-left dev status pill (“Rendering…”, route indicators) in development. */
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  onDemandEntries: {
    maxInactiveAge: 1000 * 60 * 60,
    pagesBufferLength: 5,
  },
}

export default nextConfig
