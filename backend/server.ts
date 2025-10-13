import { createApp } from './app.js'
import { env } from './config/env.js'
import { getPool } from './utils/pool.js'
import { initDatabase } from './utils/init-db.js'
import { ensureUploadsDirs } from './utils/digital-upload-paths.js'
import { warmupChatbot } from './services/chatbot.service.js'

if (!env.jwtSecret) {
  // eslint-disable-next-line no-console
  console.error('JWT_SECRET is required (set it in your environment)')
  process.exit(1)
}

const app = createApp()

async function start() {
  try {
    const pool = getPool()
    await initDatabase(pool)
    ensureUploadsDirs()
    // eslint-disable-next-line no-console
    console.log(`MySQL connected: ${env.mysql.database} @ ${env.mysql.host}:${env.mysql.port}`)
    if (env.smtp.host) {
      // eslint-disable-next-line no-console
      console.log(`SMTP: ${env.smtp.host}:${env.smtp.port} (password reset & email verification)`)
    } else {
      // eslint-disable-next-line no-console
      console.warn('SMTP_HOST not set — set it in backend/.env to send real emails (or use debug links in dev).')
    }
    if (env.chatbot.apiKey) {
      // Warm-up runs in the background; we don't await so MySQL/HTTP are ready first.
      void warmupChatbot()
      // eslint-disable-next-line no-console
      console.log(
        `Chatbot: Gemini ${env.chatbot.model} (prompt: ${env.chatbot.promptPath}${
          env.chatbot.includeKnowledgeMd ? `, extended knowledge: ${env.chatbot.knowledgeMdPath}` : ''
        })`
      )
    } else {
      // eslint-disable-next-line no-console
      console.warn('GEMINI_API_KEY not set — public chatbot will return 503 until configured in backend/.env.')
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Database initialization failed:', e)
    process.exit(1)
  }

  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on http://localhost:${env.port} (allowed origin: ${env.clientOrigin})`)
  })
}

void start()
