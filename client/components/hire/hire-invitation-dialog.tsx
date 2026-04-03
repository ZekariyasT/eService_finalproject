'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'

type HireInvitationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  freelancerId: string
  freelancerName: string
  serviceId?: string
  onSuccess?: () => void
}

export function HireInvitationDialog({
  open,
  onOpenChange,
  freelancerId,
  freelancerName,
  serviceId,
  onSuccess,
}: HireInvitationDialogProps) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle('')
    setMessage('')
    setAmount('')
    setError('')
  }, [open])

  const submit = async () => {
    setError('')
    if (title.trim().length < 3) {
      setError('Add a short project title.')
      return
    }
    if (message.trim().length < 10) {
      setError('Add a message with at least 10 characters.')
      return
    }
    const proposedAmount = Number(amount)
    if (!amount.trim() || Number.isNaN(proposedAmount) || proposedAmount <= 0) {
      setError('Add a proposed budget greater than 0.')
      return
    }
    setSubmitting(true)
    try {
      await apiFetch('/hire/invitations', {
        method: 'POST',
        json: {
          freelancerId,
          serviceId,
          title: title.trim(),
          message: message.trim(),
          proposedAmount,
        },
      })
      toast({
        title: 'Invitation sent',
        description: `Your hire invitation was sent to ${freelancerName}.`,
      })
      onSuccess?.()
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send invitation')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite {freelancerName}</DialogTitle>
          <DialogDescription>
            Send a hire invitation. The expert can accept or decline before work starts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

          <div>
            <Label htmlFor="hire-title">Project title</Label>
            <Input
              id="hire-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Website redesign"
            />
          </div>

          <div>
            <Label htmlFor="hire-message">Message</Label>
            <Textarea
              id="hire-message"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the work, timeline, and expectations."
            />
          </div>

          <div>
            <Label htmlFor="hire-amount">Proposed budget</Label>
            <Input
              id="hire-amount"
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="500"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Close
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={submitting}>
            {submitting ? 'Sending...' : 'Send invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
