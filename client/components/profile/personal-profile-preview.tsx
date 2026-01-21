import type { PersonalProfile } from '@/lib/types'

const LABELS: Record<keyof PersonalProfile, string> = {
  likes: 'Likes',
  dislikes: 'Dislikes',
  workRole: 'Role / title',
  workSummary: 'Work summary',
  yearsExperience: 'Experience',
  availability: 'Availability',
  languages: 'Languages',
  timezone: 'Time zone',
  communicationPreference: 'Communication',
  education: 'Education',
  personalNotes: 'Notes',
  dateOfBirth: 'Date of birth',
}

function formatDob(raw: string): string {
  const d = new Date(raw + (raw.length === 10 ? 'T12:00:00' : ''))
  return Number.isNaN(d.getTime()) ? raw : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

/** Read-only block for public profile: only shows fields that have content. */
export function PersonalProfilePreview({ profile }: { profile?: PersonalProfile | null }) {
  if (!profile || typeof profile !== 'object') return null

  const entries = (Object.keys(LABELS) as (keyof PersonalProfile)[])
    .map((key) => {
      const raw = profile[key]
      if (typeof raw !== 'string' || !raw.trim()) return null
      const value = key === 'dateOfBirth' ? formatDob(raw.trim()) : raw.trim()
      return { key, label: LABELS[key], value }
    })
    .filter(Boolean) as { key: keyof PersonalProfile; label: string; value: string }[]

  if (!entries.length) return null

  const fullWidth: (keyof PersonalProfile)[] = ['likes', 'dislikes', 'workSummary', 'personalNotes']

  return (
    <div className="mt-8 pt-8 border-t border-border">
      <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Personal profile</h3>
      <dl className="grid gap-5 sm:grid-cols-2">
        {entries.map(({ key, label, value }) => (
          <div key={key} className={fullWidth.includes(key) ? 'sm:col-span-2' : undefined}>
            <dt className="text-xs uppercase text-muted-foreground tracking-wider mb-1">{label}</dt>
            <dd className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
