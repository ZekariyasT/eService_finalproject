'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import {
  averageFeedbackScore,
  CONTRACT_END_REASONS,
  FREELANCER_FEEDBACK_CATEGORIES,
  type ContractEndReasonValue,
  type FreelancerFeedbackScores,
} from '@/components/contracts/contract-cancel-constants'
import { FeedbackStarRating } from '@/components/contracts/feedback-star-rating'
import type { ContractRecord } from '@/components/contracts/contract-types'

type ContractCancelScreenProps = {
  contractId: string
}

function initialFeedbackScores(): FreelancerFeedbackScores {
  return FREELANCER_FEEDBACK_CATEGORIES.reduce((scores, category) => {
    scores[category.key] = 0
    return scores
  }, {} as FreelancerFeedbackScores)
}

export function ContractCancelScreen({ contractId }: ContractCancelScreenProps) {
  const router = useRouter()
  const [contract, setContract] = useState<ContractRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [reason, setReason] = useState<ContractEndReasonValue | ''>('')
  const [reasonNote, setReasonNote] = useState('')
  const [scores, setScores] = useState<FreelancerFeedbackScores>(initialFeedbackScores)

  const load = useCallback(async () => {
    if (!contractId) return
    setLoading(true)
    try {
      const res = await apiFetch<{ contract: ContractRecord }>(`/contracts/${encodeURIComponent(contractId)}`)
      setContract(res.contract)
      setError('')
    } catch (e) {
      setContract(null)
      setError(e instanceof Error ? e.message : 'Could not load contract')
    } finally {
      setLoading(false)
    }
  }, [contractId])

  useEffect(() => {
    void load()
  }, [load])

  const averageRating = useMemo(() => {
    const values = FREELANCER_FEEDBACK_CATEGORIES.map((category) => scores[category.key])
    if (values.some((value) => value < 1)) return null
    return averageFeedbackScore(scores)
  }, [scores])

  const submit = async () => {
    setError('')
    if (!reason) {
      setError('Select a reason for ending the contract.')
      return
    }
    if (reason === 'other' && reasonNote.trim().length < 5) {
      setError('Add a short note for your selected reason.')
      return
    }
    if (FREELANCER_FEEDBACK_CATEGORIES.some((category) => scores[category.key] < 1)) {
      setError('Rate every feedback category before ending the contract.')
      return
    }

    setSubmitting(true)
    try {
      await apiFetch(`/contracts/${encodeURIComponent(contractId)}/close`, {
        method: 'POST',
        json: {
          reason,
          reasonNote: reasonNote.trim() || undefined,
          categoryScores: scores,
        },
      })
      toast({
        title: 'Contract ended',
        description: `Your feedback for ${contract?.freelancerName ?? 'the freelancer'} was saved.`,
      })
      router.push(`/dashboard/client/contracts/${encodeURIComponent(contractId)}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not end contract')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading contract…</div>
  }

  if (!contract) {
    return (
      <div className="p-8">
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error || 'Contract not found.'}
        </p>
      </div>
    )
  }

  if (contract.status !== 'in_progress') {
    return (
      <div className="p-8 space-y-4">
        <p className="text-sm text-muted-foreground">This contract is no longer active.</p>
        <Button asChild variant="outline">
          <Link href={`/dashboard/client/contracts/${encodeURIComponent(contractId)}`}>Back to contract</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <div className="space-y-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/client/contracts/${encodeURIComponent(contractId)}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to contract
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">End contract</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            End {contract.title} with {contract.freelancerName} and leave structured feedback.
          </p>
        </div>
      </div>

      <Card className="space-y-4 p-6">
        <div>
          <Label htmlFor="contract-end-reason">Reason for ending contract</Label>
          <Select value={reason} onValueChange={(value) => setReason(value as ContractEndReasonValue)}>
            <SelectTrigger id="contract-end-reason" className="mt-2 w-full">
              <SelectValue placeholder="Select a reason" />
            </SelectTrigger>
            <SelectContent>
              {CONTRACT_END_REASONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {reason === 'other' ? (
          <div>
            <Label htmlFor="contract-end-reason-note">Tell us more</Label>
            <Textarea
              id="contract-end-reason-note"
              rows={4}
              value={reasonNote}
              onChange={(event) => setReasonNote(event.target.value)}
              placeholder="Explain why you are ending this contract."
              className="mt-2"
            />
          </div>
        ) : null}
      </Card>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Feedback to freelancer</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Click the stars for each category. The saved rating is the average score.
            </p>
          </div>
          {averageRating !== null ? (
            <p className="text-sm font-medium text-primary">Average rating: {averageRating.toFixed(1)}</p>
          ) : null}
        </div>

        <div className="mt-4">
          {FREELANCER_FEEDBACK_CATEGORIES.map((category) => (
            <FeedbackStarRating
              key={category.key}
              label={category.label}
              value={scores[category.key]}
              onChange={(value) => setScores((current) => ({ ...current, [category.key]: value }))}
            />
          ))}
        </div>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" asChild disabled={submitting}>
          <Link href={`/dashboard/client/contracts/${encodeURIComponent(contractId)}`}>Keep contract</Link>
        </Button>
        <Button type="button" onClick={() => void submit()} disabled={submitting}>
          {submitting ? 'Ending…' : 'End contract'}
        </Button>
      </div>
    </div>
  )
}
