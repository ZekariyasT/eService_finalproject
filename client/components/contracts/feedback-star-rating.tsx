'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

type FeedbackStarRatingProps = {
  value: number
  onChange: (value: number) => void
  label: string
}

export function FeedbackStarRating({ value, onChange, label }: FeedbackStarRatingProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-4 last:border-b-0">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            aria-label={`${label}: ${score} out of 5`}
            onClick={() => onChange(score)}
            className="rounded-sm p-0.5 transition-colors hover:bg-muted"
          >
            <Star
              className={cn(
                'h-5 w-5',
                score <= value ? 'fill-primary text-primary' : 'text-muted-foreground/40'
              )}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
