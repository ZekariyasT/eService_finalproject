import multer from 'multer'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import { getMessagesUploadRoot, sanitizeOriginalFilename } from '../utils/digital-upload-paths.js'

/** Same sensible allowlist as digital products (no exe); max 25 MB per message attachment */
const allowed =
  /\.(zip|rar|7z|tar|gz|pdf|mp4|webm|mkv|mov|avi|doc|docx|ppt|pptx|xls|xlsx|txt|csv|png|jpg|jpeg|gif|webp)$/i

export const messageAttachmentMulter = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      const dir = getMessagesUploadRoot()
      fs.mkdirSync(dir, { recursive: true })
      cb(null, dir)
    },
    filename(_req, file, cb) {
      cb(null, `${randomUUID()}-${sanitizeOriginalFilename(file.originalname)}`)
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!allowed.test(file.originalname)) {
      cb(new Error('File type not allowed.'))
      return
    }
    cb(null, true)
  },
}).single('file')
