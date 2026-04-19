'use client'

import { useParams } from 'next/navigation'
import { ContractCancelScreen } from '@/components/contracts/contract-cancel-screen'

export default function ClientContractEndPage() {
  const params = useParams<{ id: string }>()

  return <ContractCancelScreen contractId={params.id} />
}
