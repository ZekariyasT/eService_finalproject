'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { ContractDetailView } from '@/components/contracts/contract-detail-view'
import { ContractWorkPanel } from '@/components/contracts/contract-work-panel'
import { ContractFeedbackPanel } from '@/components/contracts/contract-feedback-panel'
import type { ContractDeliveryRecord, ContractRecord } from '@/components/contracts/contract-types'

type ContractDetailScreenProps = {
  contractId: string
  role: 'client' | 'freelancer'
  backHref: string
  messagesHref: (contract: ContractRecord) => string
  counterpartyLabel: string
  getCounterpartyName: (contract: ContractRecord) => string
}

export function ContractDetailScreen({
  contractId,
  role,
  backHref,
  messagesHref,
  counterpartyLabel,
  getCounterpartyName,
}: ContractDetailScreenProps) {
  const [contract, setContract] = useState<ContractRecord | null>(null)
  const [deliveries, setDeliveries] = useState<ContractDeliveryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    if (!contractId) return
    setLoading(true)
    try {
      const res = await apiFetch<{ contract: ContractRecord; deliveries: ContractDeliveryRecord[] }>(
        `/contracts/${encodeURIComponent(contractId)}`
      )
      setContract(res.contract)
      setDeliveries(res.deliveries)
      setMessage('')
    } catch (e) {
      setContract(null)
      setDeliveries([])
      setMessage(e instanceof Error ? e.message : 'Could not load contract')
    } finally {
      setLoading(false)
    }
  }, [contractId])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading contract…</div>
  }

  if (!contract) {
    return (
      <div className="p-8">
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {message || 'Contract not found.'}
        </p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <ContractDetailView
        contract={contract}
        backHref={backHref}
        messagesHref={messagesHref(contract)}
        counterpartyLabel={counterpartyLabel}
        counterpartyName={getCounterpartyName(contract)}
      />
      <div className="mt-6 space-y-6">
        <ContractWorkPanel contract={contract} deliveries={deliveries} role={role} onUpdated={load} />
        <ContractFeedbackPanel contract={contract} counterpartyName={getCounterpartyName(contract)} />
      </div>
    </div>
  )
}
