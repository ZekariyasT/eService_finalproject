'use client'

import { Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTranslation, type AppLocale } from '@/lib/translation-context'
import { cn } from '@/lib/utils'

/** Classic “文 + A” translation glyph (similar to common translate affordances). */
function TranslateGlyphIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn('h-5 w-5', className)}
      aria-hidden
    >
      <text
        x="1"
        y="15"
        fontSize="12"
        fontWeight="700"
        fontFamily="system-ui, 'Segoe UI', sans-serif"
      >
        文
      </text>
      <text
        x="10"
        y="21"
        fontSize="11"
        fontWeight="700"
        fontFamily="Georgia, 'Times New Roman', serif"
      >
        A
      </text>
    </svg>
  )
}

const locales: { value: AppLocale; label: string; native?: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'am', label: 'Amharic', native: 'አማርኛ' },
]

const triggerStyles = {
  darkNav:
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
  tealSidebar:
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
  cardHeader:
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
} as const

export type LanguageSwitcherVariant = keyof typeof triggerStyles

type LanguageSwitcherProps = {
  className?: string
  /** Controls trigger colors for teal nav, teal sidebar, or light admin chrome. */
  variant?: LanguageSwitcherVariant
}

export function LanguageSwitcher({
  className,
  variant = 'darkNav',
}: LanguageSwitcherProps) {
  const { locale, setLocale } = useTranslation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(triggerStyles[variant], className)}
          aria-label="Choose language"
        >
          <TranslateGlyphIcon />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[11rem]" data-no-translate>
        {locales.map(({ value, label, native }) => {
          const active = locale === value
          return (
            <DropdownMenuItem
              key={value}
              onClick={() => setLocale(value)}
              className="gap-2"
            >
              <span className="flex w-4 shrink-0 justify-center">
                {active ? <Check className="h-4 w-4" /> : null}
              </span>
              <span className="flex flex-col gap-0 leading-tight">
                <span>{label}</span>
                {native ? (
                  <span className="text-xs text-muted-foreground">{native}</span>
                ) : null}
              </span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
