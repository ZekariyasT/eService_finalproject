'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LegacyClientPostJobPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/client/post-job')
  }, [router])

  return null
}

