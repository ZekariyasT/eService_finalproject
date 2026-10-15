'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AutoTranslateDom } from '@/components/layout/auto-translate-dom'

const STORAGE_KEY = 'elite-locale'

export type AppLocale = 'en' | 'am'

type TranslationContextValue = {
  locale: AppLocale
  setLocale: (l: AppLocale) => void
  translate: (text: string) => Promise<string>
  /** Batch translate for DOM walker; fills the same cache as `translate`. */
  translateTexts: (texts: string[]) => Promise<Map<string, string>>
}

const TranslationContext = createContext<TranslationContextValue | null>(null)

function readStoredLocale(): AppLocale {
  if (typeof window === 'undefined') return 'en'
  try {
    const s = localStorage.getItem(STORAGE_KEY) as AppLocale | null
    return s === 'am' || s === 'en' ? s : 'en'
  } catch {
    return 'en'
  }
}

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>('en')
  const localeRef = useRef(locale)
  localeRef.current = locale

  useEffect(() => {
    const stored = readStoredLocale()
    if (stored !== 'en') setLocaleState(stored)
  }, [])

  const setLocale = useCallback((l: AppLocale) => {
    setLocaleState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale === 'am' ? 'am' : 'en'
  }, [locale])

  const cacheRef = useRef<Map<string, string>>(new Map())
  const pendingRef = useRef<Map<string, Array<(v: string) => void>>>(new Map())
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(async () => {
    const batch = pendingRef.current
    pendingRef.current = new Map()
    flushTimerRef.current = null

    const keys = [...batch.keys()]
    if (keys.length === 0) return

    const resolveLists = keys.map((k) => batch.get(k)!)
    const settle = (values: string[]) => {
      keys.forEach((key, i) => {
        const val = values[i] ?? key
        resolveLists[i].forEach((fn) => fn(val))
      })
    }

    if (localeRef.current === 'en') {
      settle(keys)
      return
    }

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: keys, target: 'am' }),
      })
      if (!res.ok) {
        settle(keys)
        return
      }
      const data = (await res.json()) as { translations?: string[] }
      const translations = data.translations ?? []
      keys.forEach((key, i) => {
        const tr = translations[i] ?? key
        cacheRef.current.set(`am:${key}`, tr)
      })
      settle(keys.map((k, i) => translations[i] ?? k))
    } catch {
      settle(keys)
    }
  }, [])

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current != null) return
    flushTimerRef.current = setTimeout(() => {
      void flush()
    }, 64)
  }, [flush])

  const translate = useCallback(
    (text: string): Promise<string> => {
      if (!text) return Promise.resolve(text)
      if (localeRef.current === 'en') return Promise.resolve(text)

      const cached = cacheRef.current.get(`am:${text}`)
      if (cached !== undefined) return Promise.resolve(cached)

      return new Promise((resolve) => {
        const list = pendingRef.current.get(text)
        if (list) list.push(resolve)
        else pendingRef.current.set(text, [resolve])
        scheduleFlush()
      })
    },
    [scheduleFlush],
  )

  const translateTexts = useCallback(async (texts: string[]): Promise<Map<string, string>> => {
    const result = new Map<string, string>()
    const unique = [...new Set(texts.map((t) => t.trim()).filter(Boolean))]
    if (localeRef.current === 'en') {
      unique.forEach((t) => result.set(t, t))
      return result
    }

    const need: string[] = []
    for (const t of unique) {
      const cached = cacheRef.current.get(`am:${t}`)
      if (cached !== undefined) result.set(t, cached)
      else need.push(t)
    }

    const chunkSize = 128
    for (let i = 0; i < need.length; i += chunkSize) {
      const chunk = need.slice(i, i + chunkSize)
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: chunk, target: 'am' }),
        })
        if (!res.ok) {
          chunk.forEach((t) => result.set(t, t))
          continue
        }
        const data = (await res.json()) as { translations?: string[] }
        const trs = data.translations ?? []
        chunk.forEach((t, j) => {
          const tr = trs[j] ?? t
          cacheRef.current.set(`am:${t}`, tr)
          result.set(t, tr)
        })
      } catch {
        chunk.forEach((t) => result.set(t, t))
      }
    }

    return result
  }, [])

  const value = useMemo(
    () => ({ locale, setLocale, translate, translateTexts }),
    [locale, setLocale, translate, translateTexts],
  )

  return (
    <TranslationContext.Provider value={value}>
      {children}
      <AutoTranslateDom />
    </TranslationContext.Provider>
  )
}

export function useTranslation() {
  const ctx = useContext(TranslationContext)
  if (!ctx) {
    throw new Error('useTranslation must be used within TranslationProvider')
  }
  return ctx
}

/** Renders English until Amharic is loaded from the API (cached afterward). */
export function useTranslated(text: string): string {
  const { locale, translate } = useTranslation()
  const [out, setOut] = useState(text)

  useEffect(() => {
    if (locale === 'en') {
      setOut(text)
      return
    }
    let cancelled = false
    void translate(text).then((t) => {
      if (!cancelled) setOut(t)
    })
    return () => {
      cancelled = true
    }
  }, [locale, text, translate])

  return out
}

export function TranslatedText({ text }: { text: string }) {
  const t = useTranslated(text)
  return (
    <span data-skip-auto-translate className="inline">
      {t}
    </span>
  )
}
