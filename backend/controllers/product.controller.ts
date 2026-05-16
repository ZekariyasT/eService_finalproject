import type { Request, Response, NextFunction } from 'express'
import { createReadStream, existsSync, statSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import type { AuthedRequest } from '../middlewares/auth.middleware.js'
import * as productRepo from '../repositories/product.repository.js'
import * as orderRepo from '../repositories/order.repository.js'
import { resolveStoredDigitalFileAbsolute } from '../utils/digital-upload-paths.js'

function isExternalDeliverableUrl(p: string | null): boolean {
  return !!p && /^https?:\/\//i.test(p)
}

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const items = await productRepo.listActiveProducts()
    return res.json({ products: items })
  } catch (e) {
    return next(e)
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    const p = await productRepo.getProductById(id)
    if (!p || p.status !== 'active') return res.status(404).json({ error: 'Product not found' })
    return res.json({ product: productRepo.toPublicProduct(p) })
  } catch (e) {
    return next(e)
  }
}

export async function create(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      fullDescription: z.string().optional().default(''),
      promotionSampleUrl: z.union([z.string().max(768), z.literal('')]).optional().nullable(),
      category: z.string().min(1),
      price: z.number().nonnegative(),
      imageUrl: z.string().max(768).optional().nullable(),
      images: z.array(z.string().max(768)).optional(),
      fullFilePath: z.union([z.string().max(768), z.literal('')]).optional().nullable(),
    })
    const body = schema.parse(req.body)
    const uid = req.auth!.userId
    const p = await productRepo.createProduct({
      creatorId: uid,
      title: body.title,
      description: body.description,
      fullDescription: body.fullDescription,
      promotionSampleUrl: body.promotionSampleUrl || null,
      category: body.category,
      price: body.price,
      imageUrl: body.imageUrl,
      images: body.images,
      fullFilePath: body.fullFilePath || null,
    })
    return res.status(201).json({ product: p })
  } catch (e) {
    return next(e)
  }
}

export async function mine(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const products = await productRepo.listProductsBySeller(req.auth!.userId)
    return res.json({ products })
  } catch (e) {
    return next(e)
  }
}

export async function update(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    const body = z
      .object({
        title: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        fullDescription: z.string().optional(),
        promotionSampleUrl: z.union([z.string().max(768), z.literal('')]).nullable().optional(),
        category: z.string().min(1).optional(),
        price: z.number().nonnegative().optional(),
        imageUrl: z.string().max(768).nullable().optional(),
        images: z.array(z.string().max(768)).optional(),
        fullFilePath: z.union([z.string().max(768), z.literal('')]).nullable().optional(),
        status: z.enum(['active', 'paused']).optional(),
      })
      .strict()
      .parse(req.body)
    const patch: Record<string, unknown> = {}
    if (body.title !== undefined) patch.title = body.title
    if (body.description !== undefined) patch.description = body.description
    if (body.fullDescription !== undefined) patch.fullDescription = body.fullDescription
    if (body.promotionSampleUrl !== undefined)
      patch.promotionSampleUrl = body.promotionSampleUrl === '' || body.promotionSampleUrl === null ? null : body.promotionSampleUrl
    if (body.category !== undefined) patch.category = body.category
    if (body.price !== undefined) patch.price = body.price
    if (body.imageUrl !== undefined) patch.imageUrl = body.imageUrl
    if (body.images !== undefined) patch.images = body.images
    if (body.fullFilePath !== undefined)
      patch.fullFilePath = body.fullFilePath === '' || body.fullFilePath === null ? null : body.fullFilePath
    if (body.status !== undefined) patch.status = body.status
    const product = await productRepo.updateProduct(id, req.auth!.userId, patch)
    if (!product) return res.status(404).json({ error: 'Product not found' })
    return res.json({ product })
  } catch (e) {
    return next(e)
  }
}

export async function remove(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    const existing = await productRepo.getProductById(id)
    if (existing?.creatorId === req.auth!.userId && existing.filePath && !isExternalDeliverableUrl(existing.filePath)) {
      const abs = resolveStoredDigitalFileAbsolute(existing.filePath)
      if (abs && existsSync(abs)) {
        try {
          unlinkSync(abs)
        } catch {
          /* ignore */
        }
      }
    }
    const ok = await productRepo.deleteProduct(id, req.auth!.userId)
    if (!ok) return res.status(404).json({ error: 'Product not found' })
    return res.json({ ok: true })
  } catch (e) {
    return next(e)
  }
}

export async function uploadFullCourseFile(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    const file = (req as Request & { file?: { path: string; filename: string } }).file
    if (!file) {
      return res.status(400).json({
        error:
          'No file was received. Choose a file from your computer (allowed types: zip, pdf, video, Office docs, images — max 150 MB). The upload field must be named "file".',
      })
    }

    const product = await productRepo.getProductById(id)
    if (!product || product.creatorId !== req.auth!.userId) {
      try {
        unlinkSync(file.path)
      } catch {
        /* ignore */
      }
      return res.status(404).json({ error: 'Product not found' })
    }

    if (product.filePath && !isExternalDeliverableUrl(product.filePath)) {
      const oldAbs = resolveStoredDigitalFileAbsolute(product.filePath)
      if (oldAbs && existsSync(oldAbs)) {
        try {
          unlinkSync(oldAbs)
        } catch {
          /* ignore */
        }
      }
    }

    const relative = `digital-products/${id}/${file.filename.replace(/\\/g, '/')}`
    const updated = await productRepo.updateProduct(id, req.auth!.userId, { fullFilePath: relative })
    if (!updated) return res.status(404).json({ error: 'Product not found' })
    return res.json({ product: updated, storedPath: relative })
  } catch (e) {
    return next(e)
  }
}

export async function downloadFullCourseFile(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const productId = z.string().min(1).parse(req.params.productId)
    const product = await productRepo.getProductById(productId)
    if (!product) return res.status(404).json({ error: 'Product not found' })

    const uid = req.auth!.userId
    const isCreator = product.creatorId === uid
    const purchased = isCreator || (await orderRepo.hasPurchasedDigitalProduct(uid, productId))
    if (!purchased) return res.status(403).json({ error: 'Access denied' })

    const fp = product.filePath
    if (!fp) return res.status(404).json({ error: 'No full-course file for this product' })
    if (isExternalDeliverableUrl(fp)) {
      return res.status(400).json({ error: 'Use the external link from your library', externalUrl: fp })
    }

    const abs = resolveStoredDigitalFileAbsolute(fp)
    if (!abs || !existsSync(abs)) return res.status(404).json({ error: 'File not found on server' })

    const st = statSync(abs)
    const downloadName = path.basename(abs)
    res.setHeader('Content-Length', st.size)
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`)
    createReadStream(abs).pipe(res)
  } catch (e) {
    return next(e)
  }
}
