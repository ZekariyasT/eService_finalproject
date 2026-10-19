import fs from 'node:fs/promises'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - no published types for the inner path
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import { GoogleGenerativeAI, type Content } from '@google/generative-ai'
import { env } from '../config/env.js'
import { ApiError } from '../errors/api-error.js'

export type ChatRole = 'user' | 'model'

export interface ChatTurn {
  role: ChatRole
  text: string
}

/** Hard limit on conversation context to keep tokens (and cost) predictable. */
const MAX_HISTORY_TURNS = 12

/** Optional extra knowledge appended to the prompt file when explicitly enabled. */
const MAX_OPTIONAL_KNOWLEDGE_CHARS = 12_000

const DEFAULT_PROMPT = [
  'You are Elite, the public assistant for Elite Ethiopia.',
  'Speak as a helpful member of our team: warm, clear, and professional.',
  'If unsure, direct users to /contact.',
].join('\n')

let cachedPrompt: string | null = null
let promptLoadPromise: Promise<string> | null = null

let cachedOptionalKnowledge: string | null = null
let optionalKnowledgeLoadPromise: Promise<string> | null = null

let genAI: GoogleGenerativeAI | null = null

function getClient(): GoogleGenerativeAI {
  if (!env.chatbot.apiKey) {
    throw new ApiError(503, 'Chatbot is not configured. Set GEMINI_API_KEY in backend/.env and restart the API.')
  }
  if (!genAI) genAI = new GoogleGenerativeAI(env.chatbot.apiKey)
  return genAI
}

function normalizeText(raw: string): string {
  return raw
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function clampOptionalKnowledge(text: string): string {
  return text.length > MAX_OPTIONAL_KNOWLEDGE_CHARS ? text.slice(0, MAX_OPTIONAL_KNOWLEDGE_CHARS) : text
}

async function readTextFile(filePath: string, label: string): Promise<string> {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const text = normalizeText(raw)
    // eslint-disable-next-line no-console
    console.log(`[chatbot] ${label} loaded from ${filePath} (${text.length.toLocaleString()} chars)`)
    return text
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // eslint-disable-next-line no-console
    console.warn(`[chatbot] failed to load ${label} at ${filePath}: ${msg}`)
    return ''
  }
}

async function loadPdfSupplement(): Promise<string> {
  if (!env.chatbot.supplementPdfKnowledge) return ''
  const filePath = env.chatbot.knowledgePdfPath
  try {
    const buf = await fs.readFile(filePath)
    const parsed = await pdfParse(buf)
    const text = normalizeText(String(parsed?.text ?? ''))
    if (!text) return ''
    const excerpt = text.length > 8_000 ? text.slice(0, 8_000) : text
    // eslint-disable-next-line no-console
    console.log(`[chatbot] PDF supplement loaded from ${filePath} (${excerpt.length.toLocaleString()} chars)`)
    return excerpt
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // eslint-disable-next-line no-console
    console.warn(`[chatbot] failed to load PDF supplement at ${filePath}: ${msg}`)
    return ''
  }
}

async function loadOptionalKnowledge(): Promise<string> {
  if (!env.chatbot.includeKnowledgeMd) return ''
  if (cachedOptionalKnowledge !== null) return cachedOptionalKnowledge
  if (optionalKnowledgeLoadPromise) return optionalKnowledgeLoadPromise

  optionalKnowledgeLoadPromise = (async () => {
    const sections: string[] = []
    const markdown = await readTextFile(env.chatbot.knowledgeMdPath, 'optional knowledge markdown')
    if (markdown) sections.push(markdown)

    const pdf = await loadPdfSupplement()
    if (pdf) sections.push('Additional reference:\n' + pdf)

    cachedOptionalKnowledge = clampOptionalKnowledge(sections.join('\n\n'))
    return cachedOptionalKnowledge
  })().finally(() => {
    optionalKnowledgeLoadPromise = null
  })

  return optionalKnowledgeLoadPromise
}

async function loadPrompt(): Promise<string> {
  if (cachedPrompt !== null) return cachedPrompt
  if (promptLoadPromise) return promptLoadPromise

  promptLoadPromise = (async () => {
    const fromFile = await readTextFile(env.chatbot.promptPath, 'prompt')
    cachedPrompt = fromFile || DEFAULT_PROMPT
    return cachedPrompt
  })().finally(() => {
    promptLoadPromise = null
  })

  return promptLoadPromise
}

/** Eager warm-up so the first user message is not slowed down by file reads. */
export async function warmupChatbot(): Promise<void> {
  if (!env.chatbot.apiKey) return
  await loadPrompt()
  if (env.chatbot.includeKnowledgeMd) await loadOptionalKnowledge()
}

function buildSystemInstruction(prompt: string, optionalKnowledge: string): string {
  if (!optionalKnowledge) return prompt.trim()
  return [
    prompt.trim(),
    '',
    'Optional extended reference (use only when relevant; do not quote verbatim):',
    optionalKnowledge,
  ].join('\n')
}

/** Appended when the visitor chose Amharic in the UI (Gemini answers in Amharic). */
const AMHARIC_RESPONSE_ADDON = [
  '## Response language (visitor preference)',
  'The visitor selected Amharic (አማርኛ) on the website.',
  'Write your ENTIRE reply in Amharic, including greetings and short explanations.',
  'The user may write in Amharic or English; answer in Amharic either way.',
  'Keep the product name Elite Ethiopia recognizable; transliterate lightly if it reads more natural in Amharic.',
  'Use Arabic numerals (0–9) for counts and prices unless Ethiopic numerals are clearly more appropriate.',
].join('\n')

function applyLocaleToSystemInstruction(base: string, locale: 'en' | 'am'): string {
  if (locale !== 'am') return base
  return `${base.trim()}\n\n${AMHARIC_RESPONSE_ADDON}`
}

function sectionBody(prompt: string, title: string): string | null {
  const lines = prompt.split('\n')
  const target = `## ${title}`.toLowerCase()
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim().toLowerCase()
    if (line === target || line.startsWith(`${target} `)) {
      start = i + 1
      break
    }
  }
  if (start < 0) return null
  const body: string[] = []
  for (let i = start; i < lines.length; i++) {
    if (lines[i]!.startsWith('## ')) break
    body.push(lines[i]!)
  }
  const text = normalizeText(body.join('\n'))
  return text || null
}

function sanitizeHistory(history: ChatTurn[]): Content[] {
  const trimmed = history.slice(-MAX_HISTORY_TURNS)
  const result: Content[] = []
  for (const turn of trimmed) {
    const role: ChatRole = turn.role === 'model' ? 'model' : 'user'
    const text = String(turn.text ?? '').slice(0, env.chatbot.maxMessageChars).trim()
    if (!text) continue
    result.push({ role, parts: [{ text }] })
  }
  while (result.length > 0 && result[0].role !== 'user') result.shift()
  return result
}

function offlinePromptReply(userText: string, prompt: string): string | null {
  const q = userText.toLowerCase()

  const pick = (title: string, intro: string) => {
    const body = sectionBody(prompt, title)
    if (!body) return null
    return `${intro}\n\n${body}`
  }

  if (/\b(contact|support|help|human)\b/.test(q)) {
    return pick(
      'Trust and support',
      'For account-specific help, use in-app tools first, then our Contact page (/contact).',
    )
  }
  if (/\b(coins?|reward)\b/.test(q)) {
    return pick('Coins and commission (defaults)', 'Here is how coins and commission work on Elite Ethiopia:')
  }
  if (/\b(dispute|report|review|message|notification|trust|moderation)\b/.test(q)) {
    return pick('Trust and support', 'Here is how trust, messaging, and support work on Elite Ethiopia:')
  }
  if (/\b(courses?|cart|purchase|order|inventory|analytics)\b/.test(q)) {
    return pick('Services, products, wallet', 'Here is how services, products, and purchases work on Elite Ethiopia:')
  }
  if (/\b(wallet|pay|payment|birr|commission|fee|withdraw|top\s*up)\b/.test(q)) {
    return pick('Services, products, wallet', 'Here is how payments and wallets work on Elite Ethiopia:')
  }
  if (/\b(jobs?|post|proposal|hire|contract|freelancer|client)\b/.test(q)) {
    return pick('Jobs', 'Here is how jobs work on Elite Ethiopia:')
  }
  if (/\b(service|product|seller|buy|sell|digital)\b/.test(q)) {
    return pick('Services, products, wallet', 'Here is how services and digital products work on Elite Ethiopia:')
  }
  if (/\b(sign|register|start|role|account|verify|verification)\b/.test(q)) {
    const roles = sectionBody(prompt, 'Roles')
    const start = sectionBody(prompt, 'Getting started')
    if (roles || start) {
      return ['To get started on Elite Ethiopia:', roles, start].filter(Boolean).join('\n\n')
    }
  }
  if (/\b(what is|about|elite ethiopia|marketplace)\b/.test(q)) {
    return pick('Product overview', 'Elite Ethiopia is our marketplace for clients, freelancers, and sellers:')
  }

  return pick('Product overview', 'Here is a quick overview of Elite Ethiopia:')
}

function unavailableReply(): string {
  return [
    'Live AI answers are temporarily unavailable.',
    'You can still sign up as a client, freelancer, or seller from the homepage.',
    'For human help, visit our Contact page (/contact).',
  ].join(' ')
}

function isQuotaError(message: string): boolean {
  return /quota|rate|429|too many requests|resource_exhausted/i.test(message)
}

function isAuthError(message: string): boolean {
  return /api key|api_key|permission|unauthorized|invalid/i.test(message)
}

async function generateReply(
  client: GoogleGenerativeAI,
  modelName: string,
  systemInstruction: string,
  history: Content[],
  userText: string,
): Promise<string> {
  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 600,
    },
  })
  const chatSession = model.startChat({ history })
  const result = await chatSession.sendMessage(userText)
  const reply = String(result.response.text() ?? '').trim()
  if (!reply) {
    return "Sorry, I don't have a confident answer for that. You can reach our support team via the Contact page."
  }
  return reply
}

export type ChatReplySource = 'gemini' | 'offline' | 'unavailable'

export interface ChatReply {
  reply: string
  source: ChatReplySource
}

export type ChatLocale = 'en' | 'am'

/** Send a user message to Gemini using the cached prompt file as system instruction. */
export async function chat(
  message: string,
  history: ChatTurn[] = [],
  options?: { locale?: ChatLocale },
): Promise<ChatReply> {
  const userText = String(message ?? '').trim()
  if (!userText) throw new ApiError(400, 'Message is required.')

  const locale: ChatLocale = options?.locale === 'am' ? 'am' : 'en'

  const [prompt, optionalKnowledge] = await Promise.all([loadPrompt(), loadOptionalKnowledge()])
  const clippedUserText = userText.slice(0, env.chatbot.maxMessageChars)

  if (!env.chatbot.apiKey) {
    const offline = offlinePromptReply(clippedUserText, prompt)
    return {
      reply: offline ?? unavailableReply(),
      source: offline ? 'offline' : 'unavailable',
    }
  }

  const client = getClient()
  const systemInstruction = applyLocaleToSystemInstruction(
    buildSystemInstruction(prompt, optionalKnowledge),
    locale,
  )
  const sanitizedHistory = sanitizeHistory(history)

  const models = [env.chatbot.model, ...env.chatbot.modelFallbacks].filter(
    (name, index, all) => name && all.indexOf(name) === index,
  )

  let lastError = ''
  for (const modelName of models) {
    try {
      const reply = await generateReply(client, modelName, systemInstruction, sanitizedHistory, clippedUserText)
      return { reply, source: 'gemini' }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      lastError = msg
      if (isAuthError(msg)) {
        const offline = offlinePromptReply(clippedUserText, prompt)
        if (offline) return { reply: offline, source: 'offline' }
        throw new ApiError(503, 'Chatbot is not available right now (invalid API key).')
      }
      if (isQuotaError(msg)) {
        // eslint-disable-next-line no-console
        console.warn(`[chatbot] quota exceeded for model ${modelName}; trying next fallback if any`)
        continue
      }
      // eslint-disable-next-line no-console
      console.error(`[chatbot] gemini call failed for model ${modelName}:`, msg)
      throw new ApiError(502, 'The assistant could not respond. Please try again.')
    }
  }

  // eslint-disable-next-line no-console
  console.error('[chatbot] all Gemini models unavailable:', lastError)
  const offline = offlinePromptReply(clippedUserText, prompt)
  if (offline) return { reply: offline, source: 'offline' }
  return { reply: unavailableReply(), source: 'unavailable' }
}
