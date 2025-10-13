import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
/** Always load `backend/.env` even when the process cwd is the repo root or another folder. */
dotenv.config({ path: path.join(__dirname, '../.env') })

function trimEnv(v: string | undefined): string {
  return String(v ?? '')
    .trim()
    .replace(/^\uFEFF/, '')
}

/**
 * Resolve a path from `.env` against the **backend/** folder (not the shell's
 * current working directory). This keeps `CHATBOT_KNOWLEDGE_PDF=docs/foo.pdf`
 * or `CHATBOT_KNOWLEDGE_PDF=backend/docs/foo.pdf` working no matter whether
 * the API was started from the repo root or from inside `backend/`.
 */
function resolveBackendPath(value: string, fallbackRelativeToConfigDir: string): string {
  const backendDir = path.join(__dirname, '..')
  if (!value) return path.resolve(backendDir, fallbackRelativeToConfigDir)
  if (path.isAbsolute(value)) return value
  // Strip a leading `backend/` or `backend\` so paths copied from the repo root
  // ("backend/docs/foo.pdf") still land in the right place.
  const normalised = value.replace(/^[.\\/]*backend[\\/]/i, '')
  return path.resolve(backendDir, normalised)
}

function parseModelFallbacks(raw: string): string[] {
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

export const env = {
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || '',
  /** Google OAuth (optional). Callback URL must match Google Cloud console, e.g. http://localhost:4000/auth/google/callback */
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri:
    process.env.GOOGLE_REDIRECT_URI ||
    `http://localhost:${Number(process.env.PORT || 4000)}/auth/google/callback`,
  mysql: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'elite_ethiopia',
  },
  /**
   * Seeded only when `users` table is empty (first API start). Single merged admin
   * account (super-admin role). Change in production via .env.
   * `founderEmail` and `supportAdminEmail` are intentionally the same value so legacy
   * code paths keep working after the merge.
   */
  seed: {
    founderEmail: process.env.FOUNDER_EMAIL || process.env.ADMIN_EMAIL || 'admin@eliteethiopia.com',
    founderPassword: process.env.FOUNDER_PASSWORD || process.env.ADMIN_PASSWORD || 'EliteAdmin2026!',
    supportAdminEmail: process.env.SUPPORT_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@eliteethiopia.com',
    supportAdminPassword:
      process.env.SUPPORT_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'EliteAdmin2026!',
  },
  /**
   * Updates `password_hash` for the merged admin account from env on each API start.
   * - Off when NODE_ENV=production (unless SYNC_SEED_ADMIN_PASSWORDS=1).
   * - On in local dev by default so .env passwords always work after old seeds.
   * - Set SYNC_SEED_ADMIN_PASSWORDS=0 to disable in dev.
   */
  syncSeedAdminPasswords: (() => {
    const raw = process.env.SYNC_SEED_ADMIN_PASSWORDS
    const explicitOff =
      raw !== undefined && ['0', 'false'].includes(String(raw).toLowerCase())
    const explicitOn = ['1', 'true'].includes(String(raw ?? '').toLowerCase())
    if (explicitOff) return false
    if (explicitOn) return true
    return process.env.NODE_ENV !== 'production'
  })(),
  /** How long password-reset links stay valid. */
  passwordResetExpiryMinutes: Math.max(5, Number(process.env.PASSWORD_RESET_EXPIRY_MINUTES || 60)),
  /** How long email verification links stay valid (sign-up). */
  emailVerificationExpiryMinutes: Math.max(60, Number(process.env.EMAIL_VERIFICATION_EXPIRY_MINUTES || 1440)),
  /**
   * When true, email/password login is denied until `users.verified` is true (after clicking the verification link).
   * Google sign-in continues to mark accounts verified. Set SMTP first, then enable this in production.
   */
  requireEmailVerificationForLogin: ['1', 'true', 'yes'].includes(
    String(process.env.REQUIRE_EMAIL_VERIFICATION_FOR_LOGIN || '').toLowerCase()
  ),
  smtp: {
    host: trimEnv(process.env.SMTP_HOST),
    port: Number(process.env.SMTP_PORT || 587),
    secure: ['1', 'true', 'yes'].includes(String(process.env.SMTP_SECURE || '').toLowerCase()),
    user: trimEnv(process.env.SMTP_USER),
    password: trimEnv(process.env.SMTP_PASSWORD),
    from: trimEnv(process.env.SMTP_FROM) || 'Elite Ethiopia <noreply@eliteethiopia.com>',
  },
  /**
   * Public-facing chatbot ("Elite Ethiopia assistant"). Powered by Google Gemini.
   * Each request sends the cached prompt file as the system instruction (not the full PDF).
   * Optional extended markdown/PDF only when `includeKnowledgeMd` is enabled.
   */
  chatbot: {
    apiKey: trimEnv(process.env.GEMINI_API_KEY),
    model: trimEnv(process.env.GEMINI_MODEL) || 'gemini-2.0-flash-lite',
    modelFallbacks: parseModelFallbacks(
      trimEnv(process.env.GEMINI_MODEL_FALLBACKS) || 'gemini-2.0-flash,gemini-1.5-flash'
    ),
    promptPath: resolveBackendPath(
      trimEnv(process.env.CHATBOT_PROMPT_MD),
      'docs/elite-chatbot-prompt.md'
    ),
    knowledgeMdPath: resolveBackendPath(
      trimEnv(process.env.CHATBOT_KNOWLEDGE_MD),
      'docs/elite-ethiopia-knowledge.md'
    ),
    includeKnowledgeMd: ['1', 'true', 'yes'].includes(
      String(process.env.CHATBOT_INCLUDE_KNOWLEDGE_MD || '').toLowerCase()
    ),
    /**
     * Optional legacy PDF supplement when extended knowledge is enabled.
     * Relative values in `.env` are resolved against the backend folder.
     */
    knowledgePdfPath: resolveBackendPath(
      trimEnv(process.env.CHATBOT_KNOWLEDGE_PDF),
      'docs/elite-ethiopia-knowledge.pdf'
    ),
    supplementPdfKnowledge: ['1', 'true', 'yes'].includes(
      String(process.env.CHATBOT_SUPPLEMENT_PDF || '').toLowerCase()
    ),
    /** Hard cap on user message length to keep prompt cost bounded. */
    maxMessageChars: Math.max(200, Number(process.env.CHATBOT_MAX_MESSAGE_CHARS || 2000)),
    /** Per-IP rate limit: max messages per rolling minute. */
    rateLimitPerMinute: Math.max(1, Number(process.env.CHATBOT_RATE_LIMIT_PER_MINUTE || 20)),
  },
}

