import path from 'node:path'
import fs from 'node:fs'

const UPLOADS = 'uploads'

/** Relative path from project root: uploads/ */
export function getUploadsRoot(): string {
  return path.join(process.cwd(), UPLOADS)
}

export function getDigitalProductsUploadRoot(): string {
  return path.join(getUploadsRoot(), 'digital-products')
}

export function getMessagesUploadRoot(): string {
  return path.join(getUploadsRoot(), 'messages')
}

export function ensureUploadsDirs(): void {
  fs.mkdirSync(getDigitalProductsUploadRoot(), { recursive: true })
  fs.mkdirSync(getMessagesUploadRoot(), { recursive: true })
}

/** Validates stored paths like `messages/<uuid>-<filename>` under uploads root. */
export function resolveMessagesStoredFileAbsolute(storedRelativePath: string): string | null {
  if (!storedRelativePath || /^https?:\/\//i.test(storedRelativePath)) return null
  const normalized = storedRelativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (normalized.includes('..')) return null
  if (!normalized.startsWith('messages/')) return null
  const root = path.resolve(getUploadsRoot())
  const resolved = path.resolve(path.join(root, normalized))
  if (!resolved.startsWith(root)) return null
  return resolved
}

export function sanitizeOriginalFilename(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._\- ]/g, '_').slice(0, 120)
  return base || 'file.bin'
}

/** `storedRelativePath` is like `digital-products/{productId}/{filename}` */
export function resolveStoredDigitalFileAbsolute(storedRelativePath: string): string | null {
  if (!storedRelativePath || /^https?:\/\//i.test(storedRelativePath)) return null
  const normalized = storedRelativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (normalized.includes('..')) return null
  const root = path.resolve(getUploadsRoot())
  const resolved = path.resolve(path.join(root, normalized))
  if (!resolved.startsWith(root)) return null
  return resolved
}
