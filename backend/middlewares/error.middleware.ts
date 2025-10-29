import type { NextFunction, Request, Response } from 'express'
import { MulterError } from 'multer'
import { ZodError } from 'zod'
import { ApiError } from '../errors/api-error.js'

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message, details: err.details })
  }

  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Invalid request', details: err.flatten() })
  }

  if (err instanceof MulterError) {
    const code = err.code as string
    let msg = err.message
    if (code === 'LIMIT_FILE_SIZE') msg = 'File too large (maximum 150 MB for full-course uploads).'
    else if (code === 'LIMIT_UNEXPECTED_FILE')
      msg =
        'Upload must be a single file in the form field named "file". Refresh the page and try again from the seller products screen.'
    else if (code === 'LIMIT_FILE_COUNT' || code === 'LIMIT_PART_COUNT')
      msg = 'Only one file can be uploaded at a time.'
    return res.status(400).json({ error: msg, code })
  }

  if (err instanceof Error) {
    if (/File type not allowed|Missing product id/i.test(err.message)) {
      return res.status(400).json({ error: err.message })
    }
  }

  // eslint-disable-next-line no-console
  console.error(err)
  return res.status(500).json({ error: 'Internal server error' })
}

