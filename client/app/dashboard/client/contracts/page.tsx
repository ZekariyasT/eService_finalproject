'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { ContractListBoard } from '@/components/contracts/contract-list-board'
import type { ContractRecord } from '@/components/contracts/contract-types'

export default function ClientContractsPage() {
  const [contracts, setContracts] = useState<ContractRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void apiFetch<{ contracts: ContractRecord[] }>('/contracts')
      .then((res) => {
        if (!cancelled) {
          setContracts(res.contracts)
          setMessage('')
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setContracts([])
          setMessage(e instanceof Error ? e.message : 'Could not load contracts')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Contracts</h1>
        <p className="mt-2 text-muted-foreground">Review active work agreements with your hired freelancers.</p>
      </div>

      {message ? <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</p> : null}

      <ContractListBoard
        contracts={contracts}
        loading={loading}
        detailBasePath="/dashboard/client/contracts"
        counterpartyLabel="Freelancer"
        getCounterpartyName={(contract) => contract.freelancerName}
      />
    </div>
  )
}
