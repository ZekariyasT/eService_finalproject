'use client'

import { useAuth } from '@/lib/auth-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, Briefcase, CheckCircle, Clock, DollarSign, ShoppingBag, Wallet } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'

type ClientJob = { id: string; title: string; status: string; createdAt: string }
type WalletInfo = { balance: number }
type ServiceOrder = { id: string; totalAmount: number; createdAt: string }
type ProductPurchase = { purchaseId: string; amount: number; purchasedAt: string }
type ProposalIn = { jobTitle: string; createdAt?: string }

export default function ClientDashboard() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState<ClientJob[]>([])
  const [orders, setOrders] = useState<{ id: string; total: number; createdAt: string; label: string }[]>([])
  const [applications, setApplications] = useState<ProposalIn[]>([])
  const [walletBalance, setWalletBalance] = useState(0)

  useEffect(() => {
    ;(async () => {
      try {
        const [w, j, p, so, pr] = await Promise.all([
          apiFetch<{ wallet: WalletInfo }>('/wallet/me'),
          apiFetch<{ jobs: ClientJob[] }>('/jobs/mine'),
          apiFetch<{ proposals: ProposalIn[] }>('/jobs/proposals/incoming'),
          apiFetch<{ orders: ServiceOrder[] }>('/orders/services'),
          apiFetch<{ purchases: ProductPurchase[] }>('/orders/products'),
        ])
        setWalletBalance(w.wallet.balance)
        setJobs(j.jobs)
        setApplications(p.proposals)
        const combined = [
          ...so.orders.map((o) => ({
            id: o.id,
            total: Number(o.totalAmount),
            createdAt: o.createdAt,
            label: `Service order ${o.id.slice(0, 8)}…`,
          })),
          ...pr.purchases.map((purch) => ({
            id: purch.purchaseId,
            total: Number(purch.amount),
            createdAt: purch.purchasedAt,
            label: `Product purchase ${purch.purchaseId.slice(0, 8)}…`,
          })),
        ]
        setOrders(combined)
      } catch {
        setWalletBalance(0)
        setJobs([])
        setApplications([])
        setOrders([])
      }
    })()
  }, [])

  const activeJobs = jobs.filter((job) => ['open', 'active', 'in_progress'].includes(job.status)).length
  const completedJobs = jobs.filter((job) => job.status === 'completed').length
  const totalSpending = orders.reduce((sum, order) => sum + Number(order.total || 0), 0)
  const latestActivity = useMemo(
    () =>
      [
        ...orders.slice(0, 3).map((order) => ({ label: order.label, date: order.createdAt })),
        ...jobs.slice(0, 3).map((job) => ({ label: `Job posted: ${job.title}`, date: job.createdAt })),
        ...applications.slice(0, 3).map((proposal) => ({
          label: `Proposal received for ${proposal.jobTitle}`,
          date: proposal.createdAt,
        })),
      ]
        .filter((x) => x.date)
        .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
        .slice(0, 6),
    [applications, jobs, orders]
  )

  const stats = [
    { label: 'Total Orders', value: orders.length, icon: ShoppingBag },
    { label: 'Active Jobs', value: activeJobs, icon: Briefcase },
    { label: 'Completed Jobs', value: completedJobs, icon: CheckCircle },
    { label: 'Total Spending', value: `$${totalSpending.toFixed(2)}`, icon: DollarSign },
    { label: 'Wallet Balance', value: `$${walletBalance.toFixed(2)}`, icon: Wallet },
  ]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}!</h1>
          <p className="text-muted-foreground">Browse, hire, order, and track your client activity.</p>
        </div>
        <div className="flex gap-3">
          <Button asChild><Link href="/dashboard/client/post-job">Post Job</Link></Button>
          <Button asChild variant="outline"><Link href="/products">Browse Products</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-6">
            <stat.icon className="w-8 h-8 text-primary mb-4" />
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-3xl font-bold">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <h2 className="font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {latestActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity yet.</p>
            ) : (
              latestActivity.map((item, index) => (
                <div key={index} className="flex items-center justify-between border border-border rounded-lg p-3">
                  <span>{item.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.date ? new Date(item.date).toLocaleDateString() : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Bell className="w-5 h-5" />Notifications</h2>
          <div className="space-y-3 text-sm">
            <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> {applications.length} proposal(s) to review</p>
            <p className="flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-primary" /> {orders.length} order / purchase record(s)</p>
            <p className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary" /> Job success rate: {jobs.length ? Math.round((completedJobs / jobs.length) * 100) : 0}%</p>
          </div>
        </Card>
      </div>

      <Card className="p-6 mt-6">
        <h2 className="font-semibold mb-3">Spending overview</h2>
        <p className="text-sm text-muted-foreground">
          Totals above combine service orders and digital product purchases from your account.
        </p>
      </Card>
    </div>
  )
}
