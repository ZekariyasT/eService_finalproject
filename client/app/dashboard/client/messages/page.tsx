'use client'

import { DashboardInbox } from '@/components/messaging/dashboard-inbox'

export default function ClientMessagesPage() {
  return (
    <DashboardInbox
      emptyHint={
        <>
          <p>No conversations yet</p>
          <p className="text-xs mt-2">Open a proposal and use &quot;Message freelancer&quot; to start.</p>
        </>
      }
      selectConversationHint="Select a conversation or message a freelancer from Proposals."
      chatHeaderNote="Messages are stored for your records."
    />
  )
}
