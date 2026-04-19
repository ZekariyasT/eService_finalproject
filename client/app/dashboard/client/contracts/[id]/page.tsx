'use client'

import { useParams } from 'next/navigation'
import { ContractDetailScreen } from '@/components/contracts/contract-detail-screen'

export default function ClientContractDetailPage() {
  const params = useParams<{ id: string }>()

  return (
    <ContractDetailScreen
      contractId={params.id}
      role="client"
      backHref="/dashboard/client/contracts"
      messagesHref={(contract) => `/dashboard/client/messages?peer=${encodeURIComponent(contract.freelancerId)}`}
      counterpartyLabel="Freelancer"
      getCounterpartyName={(contract) => contract.freelancerName}
    />
  )
}
