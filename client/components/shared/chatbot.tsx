'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useTranslation, useTranslated } from '@/lib/translation-context'

type ChatRole = 'user' | 'model'

interface ChatMessage {
  id: number
  role: ChatRole
  text: string
}

const HELLO_ID = 0

const HELLO_TEXT_EN =
  "Hi! I'm Elite, part of the Elite Ethiopia team. Ask how our marketplace works — roles, jobs, wallet, coins, or getting started. For account-specific help, use Contact."

const HELLO_MESSAGE: ChatMessage = {
  id: HELLO_ID,
  role: 'model',
  text: HELLO_TEXT_EN,
}

export function Chatbot() {
  const pathname = usePathname()
  const { locale, translateTexts } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([HELLO_MESSAGE])
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const title = useTranslated('Elite Ethiopia Assistant')
  const subtitle = useTranslated('Ask about the marketplace')
  const placeholder = useTranslated('Ask Elite anything…')
  const thinking = useTranslated('Elite is thinking…')
  const errSuffix = useTranslated('You can also reach our team from the Contact page.')
  const ariaOpen = useTranslated('Open Elite Ethiopia chat assistant')
  const ariaClose = useTranslated('Close chat')
  const ariaSend = useTranslated('Send message')

  const isHiddenRoute =
    pathname?.startsWith('/admin') || pathname?.startsWith('/dashboard')

  useEffect(() => {
    if (!isOpen) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, isOpen, isSending])

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (locale === 'en') {
        if (cancelled) return
        setMessages((prev) => {
          if (!prev.length || prev[0]!.id !== HELLO_ID) return prev
          return [{ ...prev[0]!, text: HELLO_TEXT_EN }, ...prev.slice(1)]
        })
        return
      }
      const key = HELLO_TEXT_EN.trim()
      const map = await translateTexts([key])
      if (cancelled) return
      const tr = map.get(key) ?? HELLO_TEXT_EN
      setMessages((prev) => {
        if (!prev.length || prev[0]!.id !== HELLO_ID) return prev
        return [{ ...prev[0]!, text: tr }, ...prev.slice(1)]
      })
    })()
    return () => {
      cancelled = true
    }
  }, [locale, translateTexts])

  async function handleSendMessage() {
    const text = inputValue.trim()
    if (!text || isSending) return
    const userMessage: ChatMessage = { id: Date.now(), role: 'user', text }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInputValue('')
    setIsSending(true)
    try {
      const history = nextMessages
        .filter((m) => m.id !== HELLO_ID)
        .map((m) => ({ role: m.role, text: m.text }))
      const data = await apiFetch<{ reply: string }>(
        '/chatbot/message',
        {
          method: 'POST',
          json: {
            message: text,
            history,
            locale: locale === 'am' ? 'am' : 'en',
          },
          timeoutMs: 30_000,
        },
      )
      const reply = String(data?.reply ?? '').trim()
      if (!reply) throw new Error('Empty reply from assistant.')
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'model', text: reply }])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.'
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'model',
          text: `${msg} ${errSuffix}`,
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  if (isHiddenRoute) return null

  return (
    <>
      {isOpen ? (
        <div className="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-lg shadow-lg z-50 flex flex-col h-[600px] max-h-[80vh]">
          <div className="bg-gradient-to-r from-[#0A5B59] to-[#00786F] text-white p-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm opacity-90">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              aria-label={ariaClose}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap break-words ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-secondary text-secondary-foreground rounded-bl-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="bg-secondary text-secondary-foreground px-3 py-2 rounded-lg rounded-bl-sm text-sm flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="opacity-80">{thinking}</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border flex gap-2">
            <Input
              ref={inputRef}
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSendMessage()
                }
              }}
              disabled={isSending}
            />
            <Button
              type="button"
              onClick={() => void handleSendMessage()}
              size="icon"
              className="bg-primary hover:bg-primary/90"
              disabled={isSending || !inputValue.trim()}
              aria-label={ariaSend}
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 w-14 h-14 bg-gradient-to-r from-[#0A5B59] to-[#00786F] rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center text-white z-50 hover:scale-110 transition-transform"
          aria-label={ariaOpen}
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
    </>
  )
}
