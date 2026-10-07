'use client'

import { DashboardInbox } from '@/components/messaging/dashboard-inbox'

export default function AdminMessagesPage() {
  return (
    <DashboardInbox
      title="Admin Messages"
      emptyHint={
        <>
          <p>No conversations yet</p>
          <p className="text-xs mt-2">
            Open Manage Users and use &quot;Message user&quot; to start a conversation with any account.
          </p>
        </>
      }
      selectConversationHint="Select a conversation, or start one from Manage Users."
      chatHeaderNote="Internal admin communication. Messages are stored on the server."
    />
  )
}
