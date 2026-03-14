'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LegacyClientMyJobsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/client/my-jobs')
  }, [router])

  return null
}

