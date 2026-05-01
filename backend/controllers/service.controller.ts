import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import type { AuthedRequest } from '../middlewares/auth.middleware.js'
import * as serviceRepo from '../repositories/service.repository.js'
import { ApiError } from '../errors/api-error.js'

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z
      .object({
        q: z.string().trim().max(200).optional(),
        scope: z.enum(['all', 'freelancer', 'service']).optional(),
        serviceCategory: z.string().trim().max(80).optional(),
        maxPrice: z.coerce.number().nonnegative().optional(),
        maxDeliveryDays: z.coerce.number().int().positive().max(365).optional(),
        minRating: z.coerce.number().min(0).max(5).optional(),
        location: z.string().trim().max(120).optional(),
        page: z.coerce.number().int().positive().optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
        sort: z.enum(['newest', 'price_asc', 'price_desc', 'rating_desc', 'delivery_asc']).optional(),
      })
      .strict()
    const query = schema.parse(_req.query)
    const result = await serviceRepo.listActiveServices({
      q: query.q,
      scope: query.scope ?? 'all',
      serviceCategory: query.serviceCategory,
      maxPrice: query.maxPrice,
      maxDeliveryDays: query.maxDeliveryDays,
      minRating: query.minRating,
      location: query.location,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      sort: query.sort ?? 'newest',
    })
    return res.json(result)
  } catch (e) {
    return next(e)
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    const svc = await serviceRepo.getServiceById(id)
    if (!svc) return res.status(404).json({ error: 'Service not found' })
    return res.json({ service: svc })
  } catch (e) {
    return next(e)
  }
}

export async function mine(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const uid = req.auth!.userId
    const items = await serviceRepo.listServicesByFreelancer(uid)
    return res.json({ services: items })
  } catch (e) {
    return next(e)
  }
}

export async function create(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      category: z.string().min(1),
      priceMin: z.number().nonnegative(),
      priceMax: z.number().nonnegative(),
      deliveryDays: z.number().int().positive().max(365),
      imageUrl: z.string().max(768).optional().nullable(),
      tags: z.array(z.string()).optional(),
    })
    const body = schema.parse(req.body)
    const uid = req.auth!.userId
    const svc = await serviceRepo.createService({
      freelancerId: uid,
      title: body.title,
      description: body.description,
      category: body.category,
      priceMin: body.priceMin,
      priceMax: body.priceMax,
      deliveryDays: body.deliveryDays,
      imageUrl: body.imageUrl,
      tags: body.tags,
    })
    return res.status(201).json({ service: svc })
  } catch (e) {
    return next(e)
  }
}

export async function update(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    const schema = z
      .object({
        title: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        category: z.string().min(1).optional(),
        priceMin: z.number().nonnegative().optional(),
        priceMax: z.number().nonnegative().optional(),
        deliveryDays: z.number().int().positive().max(365).optional(),
        imageUrl: z.string().max(768).optional().nullable(),
        tags: z.array(z.string()).optional(),
        status: z.enum(['active', 'paused']).optional(),
      })
      .strict()
    const body = schema.parse(req.body)
    const uid = req.auth!.userId
    const svc = await serviceRepo.updateService(id, uid, {
      ...body,
      priceMin: body.priceMin,
      priceMax: body.priceMax,
      deliveryDays: body.deliveryDays,
      imageUrl: body.imageUrl,
    })
    if (!svc) throw new ApiError(404, 'Service not found')
    return res.json({ service: svc })
  } catch (e) {
    return next(e)
  }
}

export async function remove(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    const uid = req.auth!.userId
    const ok = await serviceRepo.deleteService(id, uid)
    if (!ok) throw new ApiError(404, 'Service not found')
    return res.json({ ok: true })
  } catch (e) {
    return next(e)
  }
}
