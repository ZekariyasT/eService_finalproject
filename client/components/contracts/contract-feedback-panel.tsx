'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import type { ContractRecord } from '@/components/contracts/contract-types'

type ContractReview = {
  id: string
  reviewerId: string
  targetUserId: string
  rating: number
  comment: string
  createdAt: string
}

type ContractFeedbackPanelProps = {
  contract: ContractRecord
  counterpartyName: string
}

export function ContractFeedbackPanel({ contract, counterpartyName }: ContractFeedbackPanelProps) {
  const [myReview, setMyReview] = useState<ContractReview | null>(null)
  const [partnerReview, setPartnerReview] = useState<ContractReview | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiFetch<{ myReview: ContractReview | null; partnerReview: ContractReview | null }>(
        `/contracts/${encodeURIComponent(contract.id)}/feedback`
      )
      setMyReview(res.myReview)
      setPartnerReview(res.partnerReview)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load feedback')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (contract.status !== 'completed') return
    void load()
  }, [contract.id, contract.status])

  const submitFeedback = async () => {
    setError('')
    if (comment.trim().length < 3) {
      setError('Add a short comment with your rating.')
      return
    }
    setSubmitting(true)
    try {
      await apiFetch(`/contracts/${encodeURIComponent(contract.id)}/feedback`, {
        method: 'POST',
        json: {
          rating,
          comment: comment.trim(),
        },
      })
      toast({
        title: 'Feedback submitted',
        description: `Your rating for ${counterpartyName} was saved.`,
      })
      setComment('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit feedback')
    } finally {
      setSubmitting(false)
    }
  }

  if (contract.status !== 'completed') return null

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold">Rate your experience</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        After the contract ends, both the client and freelancer can leave feedback for each other.
      </p>

      {loading ? <p className="mt-4 text-sm text-muted-foreground">Loading feedback…</p> : null}
      {error ? <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

      {partnerReview ? (
        <div className="mt-4 rounded-xl border border-border/70 bg-muted/30 p-4">
          <p className="text-sm font-medium">Feedback from {counterpartyName}</p>
          <p className="mt-2 flex items-center gap-1 text-sm">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={index}
                className={`h-4 w-4 ${index < partnerReview.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
              />
            ))}
            <span className="ml-2 text-muted-foreground">{partnerReview.rating.toFixed(1)}</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{partnerReview.comment}</p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">{counterpartyName} has not left feedback yet.</p>
      )}

      {myReview ? (
        <div className="mt-4 rounded-xl border border-border/70 p-4">
          <p className="text-sm font-medium">Your feedback</p>
          <p className="mt-2 flex items-center gap-1 text-sm">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={index}
                className={`h-4 w-4 ${index < myReview.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
              />
            ))}
            <span className="ml-2 text-muted-foreground">{myReview.rating.toFixed(1)}</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{myReview.comment}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <Label>Rating</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={rating === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRating(value)}
                >
                  {value}★
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="contract-feedback-comment">Feedback</Label>
            <Textarea
              id="contract-feedback-comment"
              rows={4}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder={`Share how the work with ${counterpartyName} went.`}
            />
          </div>
          <Button type="button" onClick={() => void submitFeedback()} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit feedback'}
          </Button>
        </div>
      )}
    </Card>
  )
}
