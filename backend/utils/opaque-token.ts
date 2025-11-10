import { createHash } from 'node:crypto'

/** SHA-256 hex digest for opaque bearer tokens (reset, email verification, etc.). */
export function sha256Hex(plain: string): string {
  return createHash('sha256').update(plain, 'utf8').digest('hex')
}
