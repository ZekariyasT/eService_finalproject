'use client'

import { useParams } from 'next/navigation'
import { ContractDetailScreen } from '@/components/contracts/contract-detail-screen'

export default function FreelancerContractDetailPage() {
  const params = useParams<{ id: string }>()

  return (
    <ContractDetailScreen
      contractId={params.id}
      role="freelancer"
      backHref="/dashboard/freelancer/contracts"
      messagesHref={(contract) => `/dashboard/freelancer/messages?peer=${encodeURIComponent(contract.clientId)}`}
      counterpartyLabel="Client"
      getCounterpartyName={(contract) => contract.clientName}
    />
  )
}
