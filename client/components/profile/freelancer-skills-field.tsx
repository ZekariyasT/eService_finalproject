'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SKILLS } from '@/lib/constants'
import { X } from 'lucide-react'

function normalizeSkill(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

function hasSkillInsensitive(list: string[], skill: string): boolean {
  const lower = skill.toLowerCase()
  return list.some((s) => s.toLowerCase() === lower)
}

export type FreelancerSkillsFieldProps = {
  value: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
  /** Shown above the field when not disabled */
  helperText?: string
  className?: string
}

const SUGGESTION_CAP = 48

export function FreelancerSkillsField({
  value,
  onChange,
  disabled,
  helperText,
  className,
}: FreelancerSkillsFieldProps) {
  const [query, setQuery] = useState('')

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SKILLS.filter((s) => !hasSkillInsensitive(value, s) && (!q || s.toLowerCase().includes(q))).slice(
      0,
      SUGGESTION_CAP,
    )
  }, [query, value])

  const addSkill = (raw: string) => {
    const skill = normalizeSkill(raw)
    if (!skill || hasSkillInsensitive(value, skill)) return
    onChange([...value, skill])
    setQuery('')
  }

  const removeSkill = (skill: string) => {
    onChange(value.filter((s) => s !== skill))
  }

  if (disabled) {
    return (
      <div className={className}>
        {value.length === 0 ? (
          <p className="text-sm text-muted-foreground">No skills listed yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {value.map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={className}>
      {helperText ? <p className="text-sm text-muted-foreground mb-3">{helperText}</p> : null}

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-3">
          {value.map((s) => (
            <Badge key={s} variant="secondary" className="gap-1 pr-1.5 py-1">
              {s}
              <button
                type="button"
                className="rounded-sm p-0.5 hover:bg-muted-foreground/20 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Remove ${s}`}
                onClick={() => removeSkill(s)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center mb-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addSkill(query)
            }
          }}
          placeholder="Type a skill and Add (e.g. Premiere Pro, Amharic translation)"
          className="flex-1"
        />
        <Button type="button" variant="secondary" className="shrink-0" onClick={() => addSkill(query)}>
          Add custom
        </Button>
      </div>

      <p className="text-xs font-medium text-muted-foreground mb-2">Suggestions — tap to add</p>
      <div className="max-h-44 overflow-y-auto rounded-lg border border-border bg-muted/20 p-2">
        <div className="flex flex-wrap gap-2">
          {suggestions.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1 py-2">
              No matches in the list — use &quot;Add custom&quot; for anything else.
            </p>
          ) : (
            suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addSkill(s)}
                className="rounded-full border border-transparent bg-secondary px-3 py-1.5 text-sm text-secondary-foreground transition-colors hover:bg-secondary/80"
              >
                {s}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
