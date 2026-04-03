'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Briefcase, Mail, MessageCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InvitationCard } from '@/components/hire/invitation-card'
import {
  countInvitationsByTab,
  filterInvitationsByTab,
  type InvitationStatusTab,
} from '@/components/hire/invitation-status'

export type HireInvitationListItem = {
  id: string
  title: string
  message: string
  proposedAmount: number
  status: string
  serviceTitle: string | null
  createdAt: string
  counterpartyName: string
  counterpartyId: string
  jobId: string | null
}

type HireInvitationsBoardProps = {
  mode: 'sent' | 'received'
  invitations: HireInvitationListItem[]
  loading: boolean
  emptyTitle: string
  emptyDescription: string
  onCancel?: (id: string) => void | Promise<void>
  onAccept?: (id: string) => void | Promise<void>
  onDecline?: (id: string) => void | Promise<void>
}

const TAB_LABELS: Record<InvitationStatusTab, string> = {
  pending: 'Pending',
  cancelled: 'Canceled',
  accepted: 'Accepted',
}

const EMPTY_TAB_COPY: Record<InvitationStatusTab, string> = {
  pending: 'No pending invitations in this list.',
  cancelled: 'No canceled invitations in this list.',
  accepted: 'No accepted invitations in this list.',
}

export function HireInvitationsBoard({
  mode,
  invitations,
  loading,
  emptyTitle,
  emptyDescription,
  onCancel,
  onAccept,
  onDecline,
}: HireInvitationsBoardProps) {
  const [activeTab, setActiveTab] = useState<InvitationStatusTab>('pending')
  const counterpartyDirection = mode === 'sent' ? 'to' : 'from'
  const messagesPath = mode === 'sent' ? '/dashboard/client/messages' : '/dashboard/freelancer/messages'
  const contractsPath = mode === 'sent' ? '/dashboard/client/contracts' : '/dashboard/freelancer/contracts'

  const grouped = useMemo(
    () => ({
      pending: filterInvitationsByTab(invitations, 'pending'),
      cancelled: filterInvitationsByTab(invitations, 'cancelled'),
      accepted: filterInvitationsByTab(invitations, 'accepted'),
    }),
    [invitations],
  )

  if (loading) {
    return <Card className="p-8 text-center text-muted-foreground">Loading invitations…</Card>
  }

  if (invitations.length === 0) {
    return (
      <Card className="p-10 text-center">
        <Mail className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">{emptyTitle}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{emptyDescription}</p>
      </Card>
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as InvitationStatusTab)} className="w-full">
      <TabsList className="mb-6 h-auto flex-wrap">
        {(Object.keys(TAB_LABELS) as InvitationStatusTab[]).map((tab) => (
          <TabsTrigger key={tab} value={tab} className="px-4">
            {TAB_LABELS[tab]} ({countInvitationsByTab(invitations, tab)})
          </TabsTrigger>
        ))}
      </TabsList>

      {(Object.keys(TAB_LABELS) as InvitationStatusTab[]).map((tab) => (
        <TabsContent key={tab} value={tab} className="space-y-4">
          {grouped[tab].length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">{EMPTY_TAB_COPY[tab]}</Card>
          ) : (
            grouped[tab].map((invitation) => (
              <InvitationCard
                key={invitation.id}
                title={invitation.title}
                counterpartyName={invitation.counterpartyName}
                counterpartyDirection={counterpartyDirection}
                serviceTitle={invitation.serviceTitle}
                message={invitation.message}
                proposedAmount={invitation.proposedAmount}
                status={invitation.status}
                createdAt={invitation.createdAt}
                actions={
                  tab === 'pending' && mode === 'sent' && onCancel ? (
                    <Button variant="outline" className="w-full" onClick={() => void onCancel(invitation.id)}>
                      Cancel invitation
                    </Button>
                  ) : tab === 'pending' && mode === 'received' && onAccept && onDecline ? (
                    <>
                      <Button className="w-full" onClick={() => void onAccept(invitation.id)}>
                        Accept
                      </Button>
                      <Button variant="outline" className="w-full" onClick={() => void onDecline(invitation.id)}>
                        Decline
                      </Button>
                    </>
                  ) : tab === 'accepted' ? (
                    <>
                      {invitation.jobId ? (
                        <Button asChild className="w-full">
                          <Link href={`${contractsPath}/${invitation.jobId}`}>
                            <Briefcase className="mr-2 h-4 w-4" />
                            Open contract
                          </Link>
                        </Button>
                      ) : null}
                      <Button asChild variant="outline" className="w-full">
                        <Link href={`${messagesPath}?peer=${encodeURIComponent(invitation.counterpartyId)}`}>
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Message {invitation.counterpartyName}
                        </Link>
                      </Button>
                    </>
                  ) : undefined
                }
              />
            ))
          )}
        </TabsContent>
      ))}
    </Tabs>
  )
}
