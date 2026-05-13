import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import { getDigitalProductsUploadRoot, sanitizeOriginalFilename } from '../utils/digital-upload-paths.js'

/** Keep message in sync with client `accept` + validateFullCourseFile on seller products page. */
const allowed =
  /\.(zip|rar|7z|tar|gz|pdf|mp4|webm|mkv|mov|avi|doc|docx|ppt|pptx|xls|xlsx|txt|csv|png|jpg|jpeg|gif|webp|svg|epub|json|bmp|tif|tiff)$/i

export const digitalProductFullCourseMulter = multer({
  storage: multer.diskStorage({
    destination(req, _file, cb) {
      const productId = req.params.id
      if (!productId || typeof productId !== 'string') {
        cb(new Error('Missing product id'), '')
        return
      }
      const dir = path.join(getDigitalProductsUploadRoot(), productId)
      fs.mkdirSync(dir, { recursive: true })
      cb(null, dir)
    },
    filename(_req, file, cb) {
      cb(null, `${randomUUID()}-${sanitizeOriginalFilename(file.originalname)}`)
    },
  }),
  limits: { fileSize: 150 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!allowed.test(file.originalname)) {
      cb(
        new Error(
          'File type not allowed. Rename the file to end with an allowed extension (e.g. .zip, .pdf, .mp4, .docx, .jpg, .webp), then try again.'
        )
      )
      return
    }
    cb(null, true)
  },
}).single('file')
