'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/lib/translation-context'

const DEBOUNCE_MS = 420

type TextStore = {
  tracked: Text[]
  originals: WeakMap<Text, string>
}

function looksTranslatable(s: string): boolean {
  const t = s.trim()
  if (t.length < 2) return false
  if (!/[A-Za-z]/.test(t)) return false
  if (/^[\s\d$€£¥,.%\-+/():]+$/.test(t.replace(/\s/g, ''))) return false
  return true
}

function shouldSkipTextParent(parent: Element | null): boolean {
  if (!parent) return true
  if (parent.closest('[data-no-translate], [data-skip-auto-translate]')) return true
  const tag = parent.tagName
  if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return true
  if (parent.closest('svg')) return true
  if (parent.closest('pre, code')) return true
  if (parent.isContentEditable) return true
  return false
}

function collectTextNodes(root: Node, acc: Text[]) {
  if (root.nodeType === Node.TEXT_NODE) {
    const tn = root as Text
    const p = tn.parentElement
    if (shouldSkipTextParent(p)) return
    const raw = tn.textContent ?? ''
    if (!looksTranslatable(raw)) return
    acc.push(tn)
    return
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return
  const el = root as Element
  const tag = el.tagName
  if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return
  for (let i = 0; i < el.childNodes.length; i++) {
    collectTextNodes(el.childNodes[i]!, acc)
  }
}

function collectPlaceholderElements(root: Element): (HTMLInputElement | HTMLTextAreaElement)[] {
  const list = root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    'input[placeholder], textarea[placeholder]',
  )
  const out: (HTMLInputElement | HTMLTextAreaElement)[] = []
  list.forEach((el) => {
    if (el.closest('[data-no-translate], [data-skip-auto-translate]')) return
    if (looksTranslatable(el.placeholder)) out.push(el)
  })
  return out
}

export function AutoTranslateDom() {
  const { locale, translateTexts } = useTranslation()
  const pathname = usePathname()
  const storeRef = useRef<TextStore>({
    tracked: [],
    originals: new WeakMap(),
  })
  const phOrigRef = useRef(new Map<Element, string>())

  const restore = useCallback(() => {
    const store = storeRef.current
    for (const node of store.tracked) {
      if (!node.isConnected) continue
      const o = store.originals.get(node)
      if (o !== undefined) node.textContent = o
    }
    store.tracked = []
    store.originals = new WeakMap()

    phOrigRef.current.forEach((orig, el) => {
      if (el.isConnected && 'placeholder' in el) {
        ;(el as HTMLInputElement).placeholder = orig
      }
    })
    phOrigRef.current.clear()
  }, [])

  useEffect(() => {
    if (locale === 'en') {
      restore()
    }
  }, [locale, restore])

  useEffect(() => {
    if (locale !== 'am' || typeof document === 'undefined') return

    storeRef.current.tracked = []
    storeRef.current.originals = new WeakMap()
    phOrigRef.current.clear()

    let cancelled = false
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    let applying = false

    const runTranslate = async () => {
      if (cancelled || applying) return
      applying = true
      try {
        const body = document.body
        if (!body) return

        const texts: Text[] = []
        collectTextNodes(body, texts)
        const trimmedKeys = texts.map((n) => (n.textContent ?? '').trim())
        const unique = [...new Set(trimmedKeys.filter(looksTranslatable))]

        const phEls = collectPlaceholderElements(body)
        const phStrings = [...new Set(phEls.map((e) => e.placeholder.trim()))].filter(looksTranslatable)

        const toFetch = [...new Set([...unique, ...phStrings])]
        if (toFetch.length === 0) return

        const map = await translateTexts(toFetch)
        if (cancelled) return

        const store = storeRef.current

        for (let i = 0; i < texts.length; i++) {
          const node = texts[i]!
          const key = trimmedKeys[i]!
          if (!looksTranslatable(key)) continue
          const tr = map.get(key) ?? key
          if (tr === (node.textContent ?? '').trim()) continue

          if (!store.originals.has(node)) {
            store.originals.set(node, node.textContent ?? '')
            store.tracked.push(node)
          }

          const raw = node.textContent ?? ''
          const lead = raw.match(/^\s*/)?.[0] ?? ''
          const trail = raw.match(/\s*$/)?.[0] ?? ''
          node.textContent = `${lead}${tr}${trail}`
        }

        for (const el of phEls) {
          const key = el.placeholder.trim()
          const tr = map.get(key) ?? key
          if (tr === el.placeholder) continue
          if (!phOrigRef.current.has(el)) {
            phOrigRef.current.set(el, el.placeholder)
          }
          el.placeholder = tr
        }
      } finally {
        applying = false
      }
    }

    const schedule = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        debounceTimer = null
        void runTranslate()
      }, DEBOUNCE_MS)
    }

    const observer = new MutationObserver(() => {
      if (!applying) schedule()
    })

    void runTranslate()
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    })

    return () => {
      cancelled = true
      if (debounceTimer) clearTimeout(debounceTimer)
      observer.disconnect()
    }
  }, [locale, pathname, translateTexts])

  return null
}
