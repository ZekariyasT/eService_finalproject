'use client'

import { DashboardInbox } from '@/components/messaging/dashboard-inbox'

export default function SellerMessagesPage() {
  return (
    <DashboardInbox title="Seller Messages" emptyHint={<p>No conversations yet.</p>} selectConversationHint="Select a conversation." />
  )
}
