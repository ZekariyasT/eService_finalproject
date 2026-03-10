'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CATEGORIES, SKILLS } from '@/lib/constants'
import { apiFetch } from '@/lib/api'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

type Attachment = { name: string; size: number }

type PreflightResult = {
  canPublish: boolean
  errors: string[]
  settings: {
    minWalletBalance: number
    maxOpenJobs: number
    maxPerDay: number
    requireIdVerification: boolean
    minProfileComplete: number
  }
}

export default function PostJobPage() {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [skillQuery, setSkillQuery] = useState('')
  const [skillDropdownOpen, setSkillDropdownOpen] = useState(false)
  const skillFieldRef = useRef<HTMLDivElement>(null)
  const [preflight, setPreflight] = useState<PreflightResult | null>(null)
  const [preflightLoading, setPreflightLoading] = useState(true)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    budgetType: 'fixed',
    fixedBudget: '',
    minBudget: '',
    maxBudget: '',
    hourlyRate: '',
    deadline: '',
    duration: '',
    visibility: 'public',
    freelancersNeeded: '1',
    experienceLevel: 'mid',
    skills: [] as string[],
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const setSelectField = (name: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const suggestedSkills = SKILLS.filter(
    (skill) =>
      !formData.skills.includes(skill) &&
      skill.toLowerCase().includes(skillQuery.trim().toLowerCase()),
  )

  const computedBudget = useCallback(() => {
    if (formData.budgetType === 'fixed') return Number(formData.fixedBudget) || 0
    if (formData.budgetType === 'hourly') return Number(formData.hourlyRate) || 0
    return Number(formData.maxBudget || formData.minBudget) || 0
  }, [formData.budgetType, formData.fixedBudget, formData.hourlyRate, formData.maxBudget, formData.minBudget])

  const fetchPreflight = useCallback(async () => {
    try {
      const result = await apiFetch<PreflightResult>(`/jobs/publish-preflight?budget=${computedBudget()}`)
      setPreflight(result)
    } catch {
      setPreflight(null)
    } finally {
      setPreflightLoading(false)
    }
  }, [computedBudget])

  useEffect(() => {
    void fetchPreflight()
  }, [fetchPreflight])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (skillFieldRef.current && !skillFieldRef.current.contains(event.target as Node)) {
        setSkillDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill) ? prev.skills : [...prev.skills, skill],
    }))
    setSkillQuery('')
    setSkillDropdownOpen(false)
  }

  const removeSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }))
  }

  const addAttachments = (files?: FileList | null) => {
    if (!files?.length) return
    const next: Attachment[] = Array.from(files).map((file) => ({ name: file.name, size: file.size }))
    setAttachments((prev) => [...prev, ...next])
  }

  const validationHint = (status: 'draft' | 'open'): string | null => {
    if (status === 'draft') return null
    const missing: string[] = []
    if (!formData.title.trim()) missing.push('job title')
    if (!formData.description.trim()) missing.push('description')
    if (!formData.category) missing.push('category')
    if (formData.skills.length === 0) missing.push('at least one skill')
    if (formData.budgetType === 'fixed' && !formData.fixedBudget) missing.push('fixed budget amount')
    if (formData.budgetType === 'range' && (!formData.minBudget || !formData.maxBudget)) missing.push('min and max budget')
    if (formData.budgetType === 'hourly' && !formData.hourlyRate) missing.push('hourly rate')
    if (!formData.deadline.trim() && !formData.duration.trim()) missing.push('deadline date or duration')
    return missing.length ? `Please add: ${missing.join(', ')}.` : null
  }

  const saveJob = async (status: 'draft' | 'open') => {
    setMessage('')
    const hint = validationHint(status)
    if (hint) {
      setMessage(hint)
      return
    }
    try {
      await apiFetch('/jobs', {
        method: 'POST',
        json: {
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          budgetType: formData.budgetType as 'fixed' | 'range' | 'hourly',
          fixedBudget: formData.fixedBudget,
          minBudget: formData.minBudget,
          maxBudget: formData.maxBudget,
          hourlyRate: formData.hourlyRate,
          deadline: formData.deadline,
          duration: formData.duration,
          visibility: formData.visibility as 'public' | 'private',
          freelancersNeeded: formData.freelancersNeeded,
          experienceLevel: formData.experienceLevel as 'junior' | 'mid' | 'senior',
          skills: formData.skills,
          attachments,
          status,
        },
      })
      setMessage(status === 'draft' ? 'Draft saved successfully.' : 'Job published and visible to freelancers.')
      if (status === 'open') router.push('/dashboard/client/my-jobs')
    } catch (e: unknown) {
      const err = e as { message?: string; details?: { gateErrors?: string[] } }
      if (err.details?.gateErrors?.length) {
        setMessage(err.details.gateErrors.join(' '))
      } else {
        setMessage(err.message ?? 'Could not save job. Sign in as a client and ensure the API is running.')
      }
      void fetchPreflight()
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Post a Job</h1>
      <p className="text-muted-foreground mb-8">
        Create a freelance job request with budget, timeline, and optional attachment file names. Jobs are saved to your account and listed for freelancers when published as open.
      </p>
      {message && (
        <p
          className={`text-sm mb-4 rounded-lg px-3 py-2 ${message.includes('Please add') ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}
          role="status"
        >
          {message}
        </p>
      )}

      <form className="max-w-3xl space-y-6" onSubmit={(e) => { e.preventDefault(); void saveJob('open') }}>
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold">Basic Info</h2>
          <div>
            <Label>Job Title</Label>
            <Input name="title" value={formData.title} onChange={handleChange} placeholder="Build a React website" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea name="description" rows={6} value={formData.description} onChange={handleChange} placeholder="Detailed requirements..." />
          </div>
          <div>
            <Label htmlFor="job-category">Category</Label>
            <Select
              value={formData.category || undefined}
              onValueChange={(value) => setSelectField('category', value)}
            >
              <SelectTrigger id="job-category" className="w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Skills Required</Label>
            <div ref={skillFieldRef} className="relative mt-2">
              <Input
                value={skillQuery}
                onChange={(e) => {
                  const value = e.target.value
                  setSkillQuery(value)
                  setSkillDropdownOpen(value.trim().length > 0)
                }}
                onFocus={() => {
                  if (skillQuery.trim()) setSkillDropdownOpen(true)
                }}
                placeholder="Search skills, e.g. React"
              />
              {skillDropdownOpen && skillQuery.trim() && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-popover shadow-md">
                  {suggestedSkills.length > 0 ? (
                    <ul className="max-h-48 overflow-y-auto p-1">
                      {suggestedSkills.map((skill) => (
                        <li key={skill}>
                          <button
                            type="button"
                            onClick={() => addSkill(skill)}
                            className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                          >
                            {skill}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-3 py-2 text-sm text-muted-foreground">No matching skills</p>
                  )}
                </div>
              )}
            </div>
            {formData.skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="rounded-full px-1 leading-none hover:bg-primary-foreground/20"
                      aria-label={`Remove ${skill}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="font-semibold">Budget & Type</h2>
          <div>
            <Label htmlFor="budget-type">Budget type</Label>
            <Select
              value={formData.budgetType}
              onValueChange={(value) => setSelectField('budgetType', value)}
            >
              <SelectTrigger id="budget-type" className="w-full">
                <SelectValue placeholder="Select budget type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed price</SelectItem>
                <SelectItem value="range">Budget range</SelectItem>
                <SelectItem value="hourly">Hourly rate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.budgetType === 'fixed' && <Input name="fixedBudget" type="number" placeholder="Fixed amount" value={formData.fixedBudget} onChange={handleChange} />}
          {formData.budgetType === 'range' && (
            <div className="grid grid-cols-2 gap-3">
              <Input name="minBudget" type="number" placeholder="Minimum" value={formData.minBudget} onChange={handleChange} />
              <Input name="maxBudget" type="number" placeholder="Maximum" value={formData.maxBudget} onChange={handleChange} />
            </div>
          )}
          {formData.budgetType === 'hourly' && <Input name="hourlyRate" type="number" placeholder="Hourly rate" value={formData.hourlyRate} onChange={handleChange} />}
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="font-semibold">Timeline & Attachments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input name="deadline" type="date" value={formData.deadline} onChange={handleChange} />
            <Input name="duration" placeholder="Duration, e.g. 2 weeks" value={formData.duration} onChange={handleChange} />
          </div>
          <Input type="file" multiple onChange={(e) => addAttachments(e.target.files)} />
          {attachments.length > 0 && <p className="text-xs text-muted-foreground">{attachments.map((file) => file.name).join(', ')}</p>}
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="font-semibold">Advanced Options</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="job-visibility">Visibility</Label>
              <Select
                value={formData.visibility}
                onValueChange={(value) => setSelectField('visibility', value)}
              >
                <SelectTrigger id="job-visibility" className="w-full">
                  <SelectValue placeholder="Visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="freelancers-needed">Freelancers needed</Label>
              <Input
                id="freelancers-needed"
                name="freelancersNeeded"
                type="number"
                min="1"
                value={formData.freelancersNeeded}
                onChange={handleChange}
                placeholder="Freelancers needed"
              />
            </div>
            <div>
              <Label htmlFor="experience-level">Experience level</Label>
              <Select
                value={formData.experienceLevel}
                onValueChange={(value) => setSelectField('experienceLevel', value)}
              >
                <SelectTrigger id="experience-level" className="w-full">
                  <SelectValue placeholder="Experience level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="junior">Junior</SelectItem>
                  <SelectItem value="mid">Mid-level</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {!preflightLoading && preflight && (
          <Card className={`p-5 space-y-3 ${preflight.canPublish ? 'border-green-300 bg-green-50 dark:bg-green-950/20' : 'border-amber-300 bg-amber-50 dark:bg-amber-950/20'}`}>
            <h2 className="font-semibold flex items-center gap-2 text-sm">
              {preflight.canPublish ? (
                <><CheckCircle2 className="w-4 h-4 text-green-600" /> Ready to publish</>
              ) : (
                <><AlertTriangle className="w-4 h-4 text-amber-600" /> Complete the following before publishing</>
              )}
            </h2>
            {preflight.errors.length > 0 && (
              <ul className="space-y-1.5">
                {preflight.errors.map((err, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <span>{err}</span>
                  </li>
                ))}
              </ul>
            )}
            {!preflight.canPublish && (
              <p className="text-xs text-muted-foreground">
                You can still save as a draft. Fix the items above, then return to publish.
              </p>
            )}
          </Card>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={preflight !== null && !preflight.canPublish}>Publish Job</Button>
          <Button type="button" variant="outline" onClick={() => void saveJob('draft')}>Save as Draft</Button>
        </div>
      </form>
    </div>
  )
}

