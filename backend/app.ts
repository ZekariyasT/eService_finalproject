import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import apiRoutes from './routes/index.js'
import { env } from './config/env.js'
import { errorHandler } from './middlewares/error.middleware.js'
import * as googleAuth from './controllers/google-auth.controller.js'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(morgan('dev'))
  app.use(express.json({ limit: '1mb' }))
  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    })
  )

  app.get('/auth/google/start', (req, res) => void googleAuth.start(req, res))
  app.get('/auth/google/callback', (req, res) => void googleAuth.callback(req, res))

  app.use('/api', apiRoutes)

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  app.use(errorHandler)

  return app
}

