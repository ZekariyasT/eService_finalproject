'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import type { ContractDeliveryRecord, ContractRecord } from '@/components/contracts/contract-types'

type ContractWorkPanelProps = {
  contract: ContractRecord
  deliveries: ContractDeliveryRecord[]
  role: 'client' | 'freelancer'
  onUpdated: () => void | Promise<void>
}

function formatDeliveryStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export function ContractWorkPanel({ contract, deliveries, role, onUpdated }: ContractWorkPanelProps) {
  const [deadline, setDeadline] = useState(contract.deadline ?? '')
  const [summary, setSummary] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [feedback, setFeedback] = useState('')
  const [savingDeadline, setSavingDeadline] = useState(false)
  const [submittingWork, setSubmittingWork] = useState(false)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [reportingIssue, setReportingIssue] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setDeadline(contract.deadline ?? '')
  }, [contract.deadline, contract.id])

  const active = contract.status === 'in_progress'
  const pendingDelivery = deliveries.find((delivery) => delivery.status === 'submitted')

  const saveDeadline = async () => {
    setError('')
    setSavingDeadline(true)
    try {
      await apiFetch(`/contracts/${encodeURIComponent(contract.id)}/deadline`, {
        method: 'PATCH',
        json: { deadline: deadline.trim() ? deadline.trim() : null },
      })
      toast({
        title: 'Deadline saved',
        description: deadline.trim() ? 'The freelancer can see the updated project deadline.' : 'Deadline cleared.',
      })
      await onUpdated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save deadline')
    } finally {
      setSavingDeadline(false)
    }
  }

  const normalizeLinkForApi = (raw: string): string | null => {
    const t = raw.trim()
    if (!t) return null
    if (/^https?:\/\//i.test(t)) return t
    return `https://${t}`
  }

  const submitWork = async () => {
    setError('')
    if (summary.trim().length < 10) {
      setError('Describe what you delivered in at least 10 characters.')
      return
    }
    if (pendingDelivery) {
      setError('Your previous delivery is still waiting for the client. Wait for approval or changes before submitting again.')
      return
    }
    setSubmittingWork(true)
    try {
      await apiFetch(`/contracts/${encodeURIComponent(contract.id)}/deliveries`, {
        method: 'POST',
        json: {
          summary: summary.trim(),
          linkUrl: normalizeLinkForApi(linkUrl),
        },
      })
      toast({
        title: 'Work submitted',
        description: 'The client can review and approve your delivery.',
      })
      setSummary('')
      setLinkUrl('')
      await onUpdated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit work')
    } finally {
      setSubmittingWork(false)
    }
  }

  const approveWork = async (deliveryId: string) => {
    setError('')
    setReviewingId(deliveryId)
    try {
      await apiFetch(
        `/contracts/${encodeURIComponent(contract.id)}/deliveries/${encodeURIComponent(deliveryId)}/approve`,
        { method: 'POST' }
      )
      toast({
        title: 'Work approved',
        description: 'This contract is now marked completed.',
      })
      await onUpdated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not approve work')
    } finally {
      setReviewingId(null)
    }
  }

  const reportIssue = async () => {
    setError('')
    if (reportReason.trim().length < 10) {
      setError('Describe the issue in at least 10 characters before reporting it.')
      return
    }
    setReportingIssue(true)
    try {
      await apiFetch('/disputes', {
        method: 'POST',
        json: {
          respondentId: contract.clientId,
          refType: 'contract',
          refId: contract.id,
          reason: reportReason.trim(),
        },
      })
      toast({
        title: 'Issue reported',
        description: 'Support admins can review this contract dispute.',
      })
      setReportReason('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not report issue')
    } finally {
      setReportingIssue(false)
    }
  }

  const requestChanges = async (deliveryId: string) => {
    setError('')
    if (feedback.trim().length < 5) {
      setError('Add feedback so the freelancer knows what to revise.')
      return
    }
    setReviewingId(deliveryId)
    try {
      await apiFetch(
        `/contracts/${encodeURIComponent(contract.id)}/deliveries/${encodeURIComponent(deliveryId)}/request-changes`,
        {
          method: 'POST',
          json: { feedback: feedback.trim() },
        }
      )
      toast({
        title: 'Changes requested',
        description: 'The freelancer can submit an updated delivery.',
      })
      setFeedback('')
      await onUpdated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not request changes')
    } finally {
      setReviewingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {error ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

      {role === 'client' && active ? (
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Project deadline</h2>
          <p className="mt-1 text-sm text-muted-foreground">Set or update the delivery date for this contract.</p>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <Label htmlFor="contract-deadline">Deadline</Label>
              <Input
                id="contract-deadline"
                type="date"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
              />
            </div>
            <Button type="button" onClick={() => void saveDeadline()} disabled={savingDeadline}>
              {savingDeadline ? 'Saving…' : 'Save deadline'}
            </Button>
          </div>
        </Card>
      ) : null}

      {role === 'freelancer' && active ? (
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Submit work</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Share what you delivered and optionally add a link to files or a preview.
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="delivery-summary">Delivery summary</Label>
              <Textarea
                id="delivery-summary"
                rows={5}
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="Describe the completed work, files included, and anything the client should review."
              />
            </div>
            <div>
              <Label htmlFor="delivery-link">Delivery link (optional)</Label>
              <Input
                id="delivery-link"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                placeholder="https://drive.google.com/..."
              />
            </div>
            <Button
              type="button"
              onClick={() => void submitWork()}
              disabled={submittingWork || Boolean(pendingDelivery)}
            >
              {pendingDelivery
                ? 'Awaiting client review'
                : submittingWork
                  ? 'Submitting…'
                  : 'Submit for approval'}
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="p-5">
        <h2 className="text-lg font-semibold">Delivery history</h2>
        {deliveries.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No work has been submitted yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {deliveries.map((delivery) => (
              <div key={delivery.id} className="rounded-xl border border-border/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{formatDeliveryStatus(delivery.status)}</p>
                    <p className="text-sm text-muted-foreground">
                      Submitted {new Date(delivery.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {delivery.status === 'submitted' && role === 'client' && active ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void approveWork(delivery.id)}
                      disabled={reviewingId === delivery.id}
                    >
                      Approve work
                    </Button>
                  ) : null}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{delivery.summary}</p>
                {delivery.linkUrl ? (
                  <a
                    href={delivery.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
                  >
                    Open delivery link
                  </a>
                ) : null}
                {delivery.clientFeedback ? (
                  <p className="mt-3 rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                    Client feedback: {delivery.clientFeedback}
                  </p>
                ) : null}
                {delivery.status === 'submitted' && role === 'client' && active ? (
                  <div className="mt-4 space-y-3">
                    <Label htmlFor={`feedback-${delivery.id}`}>Request changes</Label>
                    <Textarea
                      id={`feedback-${delivery.id}`}
                      rows={3}
                      value={feedback}
                      onChange={(event) => setFeedback(event.target.value)}
                      placeholder="Explain what still needs to be revised."
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void requestChanges(delivery.id)}
                      disabled={reviewingId === delivery.id}
                    >
                      Request changes
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
        {role === 'client' && pendingDelivery ? (
          <p className="mt-4 text-sm text-muted-foreground">A delivery is waiting for your review.</p>
        ) : null}
      </Card>

      {role === 'client' && active ? (
        <Card className="p-5">
          <h2 className="text-lg font-semibold">End contract</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose why the contract is ending and leave structured feedback for the freelancer.
          </p>
          <div className="mt-4">
            <Button asChild type="button">
              <Link href={`/dashboard/client/contracts/${encodeURIComponent(contract.id)}/end`}>
                End contract
              </Link>
            </Button>
          </div>
        </Card>
      ) : null}

      {role === 'freelancer' && active ? (
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Report issue to admin</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            If you cannot resolve the contract with the client, report the issue for admin review.
          </p>
          <div className="mt-4 space-y-3">
            <Textarea
              rows={4}
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
              placeholder="Describe the issue, what was agreed, and what support is needed."
            />
            <Button type="button" variant="outline" onClick={() => void reportIssue()} disabled={reportingIssue}>
              {reportingIssue ? 'Reporting…' : 'Report to admin'}
            </Button>
          </div>
        </Card>
      ) : null}

      {!active ? (
        <Card className="p-5 text-sm text-muted-foreground">
          {contract.status === 'completed'
            ? 'This contract has ended.'
            : 'This contract is closed and no longer accepts deliveries or changes.'}
        </Card>
      ) : null}
    </div>
  )
}
