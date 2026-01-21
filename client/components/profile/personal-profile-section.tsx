'use client'

import type { PersonalProfile } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

const fieldClass = 'w-full px-3 py-2 border border-input rounded-lg bg-background text-sm min-h-[2.5rem]'

interface PersonalProfileSectionProps {
  value: PersonalProfile
  onChange: (next: PersonalProfile) => void
  disabled?: boolean
  /** Shorter copy when embedded on profile vs full onboarding page */
  compact?: boolean
}

export function emptyPersonalProfile(): PersonalProfile {
  return {}
}

export function PersonalProfileSection({
  value,
  onChange,
  disabled,
  compact,
}: PersonalProfileSectionProps) {
  const set = (key: keyof PersonalProfile, v: string) => {
    onChange({ ...value, [key]: v || undefined })
  }

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-1">Preferences & work style</h3>
        {!compact && (
          <p className="text-sm text-muted-foreground">
            Help others understand how you like to collaborate. You can change this anytime from your profile.
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">What you like (topics, tools, ways of working)</label>
          <textarea
            className={fieldClass}
            rows={3}
            disabled={disabled}
            value={value.likes ?? ''}
            onChange={(e) => set('likes', e.target.value)}
            placeholder="e.g. Clear briefs, async updates, design systems…"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">What you dislike or prefer to avoid</label>
          <textarea
            className={fieldClass}
            rows={3}
            disabled={disabled}
            value={value.dislikes ?? ''}
            onChange={(e) => set('dislikes', e.target.value)}
            placeholder="e.g. Last-minute scope changes without discussion…"
          />
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-semibold mb-3">Work</h4>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-2">Role / title</label>
            <Input
              disabled={disabled}
              value={value.workRole ?? ''}
              onChange={(e) => set('workRole', e.target.value)}
              placeholder="e.g. Product designer, Store owner"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Years of experience (optional)</label>
            <Input
              disabled={disabled}
              value={value.yearsExperience ?? ''}
              onChange={(e) => set('yearsExperience', e.target.value)}
              placeholder="e.g. 5+ years"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Work summary</label>
            <textarea
              className={fieldClass}
              rows={3}
              disabled={disabled}
              value={value.workSummary ?? ''}
              onChange={(e) => set('workSummary', e.target.value)}
              placeholder="What you do day-to-day, industries, types of projects…"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Availability</label>
            <Input
              disabled={disabled}
              value={value.availability ?? ''}
              onChange={(e) => set('availability', e.target.value)}
              placeholder="e.g. Weekdays 9–5 EAT, weekends by request"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-semibold mb-3">Personal & communication</h4>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-2">Languages</label>
            <Input
              disabled={disabled}
              value={value.languages ?? ''}
              onChange={(e) => set('languages', e.target.value)}
              placeholder="e.g. Amharic, English"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Time zone</label>
            <Input
              disabled={disabled}
              value={value.timezone ?? ''}
              onChange={(e) => set('timezone', e.target.value)}
              placeholder="e.g. Africa/Addis_Ababa"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">How you prefer to communicate</label>
            <Input
              disabled={disabled}
              value={value.communicationPreference ?? ''}
              onChange={(e) => set('communicationPreference', e.target.value)}
              placeholder="e.g. In-app messages, email, scheduled calls"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Education (optional)</label>
            <Input
              disabled={disabled}
              value={value.education ?? ''}
              onChange={(e) => set('education', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Date of birth (optional)</label>
            <Input
              type="date"
              disabled={disabled}
              value={value.dateOfBirth ?? ''}
              onChange={(e) => set('dateOfBirth', e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Other notes</label>
            <textarea
              className={fieldClass}
              rows={2}
              disabled={disabled}
              value={value.personalNotes ?? ''}
              onChange={(e) => set('personalNotes', e.target.value)}
              placeholder="Anything else you want collaborators to know"
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
