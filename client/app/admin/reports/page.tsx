'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiFetch } from '@/lib/api'
import {
  Users,
  Briefcase,
  Wrench,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  RefreshCcw,
  Loader2,
  Download,
  TrendingUp,
  ShieldCheck,
  Coins,
  Activity,
} from 'lucide-react'

type Counted<T> = T & { count: number }
type CategoryCount = { category: string; count: number }
type StatusCount = { status: string; count: number }
type RoleCount = { role: string; count: number }
type WalletGroup = { type: string; count: number; volume: number; fees: number }

type ReportPayload = {
  generatedAt: string
  users: {
    total: number
    active: number
    suspended: number
    verified: number
    new: { last24h: number; last7d: number; last30d: number }
    byRole: RoleCount[]
  }
  listings: {
    jobs: { total: number; last7d: number; last30d: number; byStatus: StatusCount[]; topCategories: CategoryCount[] }
    services: { total: number; last7d: number; last30d: number; byStatus: StatusCount[]; topCategories: CategoryCount[] }
    products: { total: number; last7d: number; last30d: number; byStatus: StatusCount[]; topCategories: CategoryCount[] }
  }
  orders: {
    serviceOrders: { count: number; volume: number; last30dCount: number; last30dVolume: number }
    digitalPurchases: { count: number; volume: number; last30dCount: number; last30dVolume: number }
  }
  transactions: {
    userVolume: number
    platformFees: number
    wallet: WalletGroup[]
  }
  disputes: { total: number; byStatus: StatusCount[] }
  top: {
    freelancers: Array<{ id: string; name: string; earnings: number; rating: number; completedProjects: number }>
    clients: Array<{ id: string; name: string; orders: number; spent: number }>
    sellers: Array<{ id: string; name: string; sales: number; revenue: number }>
  }
  charts: {
    userGrowth: Array<{ date: string; count: number }>
    orderTrends: Array<{ date: string; count: number; revenue: number }>
    purchaseTrends: Array<{ date: string; count: number; revenue: number }>
  }
}

function fmtBr(n: number) {
  return `Br ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n)}`
}

function fmtNum(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}

function StatusList({ items }: { items: StatusCount[] }) {
  if (!items.length) return <p className="text-xs text-muted-foreground">No data</p>
  return (
    <ul className="space-y-1">
      {items.map((s) => (
        <li key={s.status} className="flex items-center justify-between text-sm">
          <span className="capitalize text-muted-foreground">{s.status}</span>
          <span className="font-medium">{fmtNum(s.count)}</span>
        </li>
      ))}
    </ul>
  )
}

function CategoryList({ items }: { items: Counted<{ category: string }>[] }) {
  if (!items.length) return <p className="text-xs text-muted-foreground">No categories yet</p>
  const max = Math.max(...items.map((c) => c.count), 1)
  return (
    <ul className="space-y-2">
      {items.map((c) => (
        <li key={c.category} className="text-sm">
          <div className="flex items-center justify-between mb-0.5">
            <span className="truncate">{c.category}</span>
            <span className="text-xs text-muted-foreground">{fmtNum(c.count)}</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{ width: `${Math.max(6, (c.count / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function AdminReportsPage() {
  const [report, setReport] = useState<ReportPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<ReportPayload>('/admin/report')
      setReport(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const downloadJSON = () => {
    if (!report) return
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `elite-ethiopia-report-${new Date(report.generatedAt).toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadCSV = () => {
    if (!report) return
    const lines: string[] = []
    lines.push('section,key,value')
    lines.push(`users,total,${report.users.total}`)
    lines.push(`users,active,${report.users.active}`)
    lines.push(`users,suspended,${report.users.suspended}`)
    lines.push(`users,verified,${report.users.verified}`)
    lines.push(`users,new_last24h,${report.users.new.last24h}`)
    lines.push(`users,new_last7d,${report.users.new.last7d}`)
    lines.push(`users,new_last30d,${report.users.new.last30d}`)
    for (const r of report.users.byRole) lines.push(`users_by_role,${r.role},${r.count}`)
    lines.push(`jobs,total,${report.listings.jobs.total}`)
    lines.push(`jobs,last30d,${report.listings.jobs.last30d}`)
    lines.push(`services,total,${report.listings.services.total}`)
    lines.push(`services,last30d,${report.listings.services.last30d}`)
    lines.push(`products,total,${report.listings.products.total}`)
    lines.push(`products,last30d,${report.listings.products.last30d}`)
    lines.push(`orders,service_orders_count,${report.orders.serviceOrders.count}`)
    lines.push(`orders,service_orders_volume,${report.orders.serviceOrders.volume}`)
    lines.push(`orders,digital_purchases_count,${report.orders.digitalPurchases.count}`)
    lines.push(`orders,digital_purchases_volume,${report.orders.digitalPurchases.volume}`)
    lines.push(`transactions,user_volume,${report.transactions.userVolume}`)
    lines.push(`transactions,platform_fees,${report.transactions.platformFees}`)
    lines.push(`disputes,total,${report.disputes.total}`)
    for (const s of report.disputes.byStatus) lines.push(`disputes_by_status,${s.status},${s.count}`)
    const csv = lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `elite-ethiopia-report-${new Date(report.generatedAt).toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const headlineKpis = useMemo(() => {
    if (!report) return []
    const userVolume = report.transactions.userVolume
    const totalListings =
      report.listings.jobs.total + report.listings.services.total + report.listings.products.total
    const openDisputes = report.disputes.byStatus.find((s) => s.status === 'open')?.count ?? 0
    return [
      {
        label: 'Total Users',
        value: fmtNum(report.users.total),
        sub: `${fmtNum(report.users.new.last30d)} joined in 30d`,
        icon: Users,
        color: 'bg-blue-500/10 text-blue-500',
      },
      {
        label: 'Active Listings',
        value: fmtNum(totalListings),
        sub: `${fmtNum(report.listings.jobs.last30d + report.listings.services.last30d + report.listings.products.last30d)} new in 30d`,
        icon: ShoppingBag,
        color: 'bg-purple-500/10 text-purple-500',
      },
      {
        label: 'User Volume',
        value: fmtBr(userVolume),
        sub: `Fees: ${fmtBr(report.transactions.platformFees)}`,
        icon: CreditCard,
        color: 'bg-primary/10 text-primary',
      },
      {
        label: 'Open Disputes',
        value: fmtNum(openDisputes),
        sub: `Total disputes: ${fmtNum(report.disputes.total)}`,
        icon: AlertTriangle,
        color: 'bg-orange-500/10 text-orange-500',
      },
    ]
  }, [report])

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Platform Report</h1>
          <p className="text-muted-foreground">
            A comprehensive snapshot of users, listings, orders, transactions and disputes on the platform.
          </p>
          {report?.generatedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Generated {new Date(report.generatedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={downloadCSV} disabled={!report}>
            <Download className="w-4 h-4" />
            Download CSV
          </Button>
          <Button variant="outline" size="sm" onClick={downloadJSON} disabled={!report}>
            <Download className="w-4 h-4" />
            Download JSON
          </Button>
        </div>
      </div>

      {error && (
        <Card className="mb-4 p-4 border-destructive/40 bg-destructive/5 text-destructive flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </Card>
      )}

      {loading && !report ? (
        <Card className="p-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </Card>
      ) : !report ? null : (
        <div className="space-y-6">
          {/* Headline KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {headlineKpis.map((kpi) => (
              <Card key={kpi.label} className="border-none shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${kpi.color}`}>
                      <kpi.icon className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mt-3">{kpi.label}</p>
                  <h3 className="text-2xl font-bold mt-1">{kpi.value}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Users section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Users
              </CardTitle>
              <CardDescription>Account composition and growth.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-xl font-semibold">{fmtNum(report.users.total)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active</p>
                  <p className="text-xl font-semibold text-primary">{fmtNum(report.users.active)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Suspended</p>
                  <p className="text-xl font-semibold text-red-600">{fmtNum(report.users.suspended)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Verified
                  </p>
                  <p className="text-xl font-semibold">{fmtNum(report.users.verified)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold mb-3">By role</h4>
                  <ul className="space-y-1">
                    {report.users.byRole.map((r) => (
                      <li key={r.role} className="flex items-center justify-between text-sm">
                        <Badge variant="secondary" className="font-normal capitalize">
                          {r.role}
                        </Badge>
                        <span className="font-medium">{fmtNum(r.count)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-3">New signups</h4>
                  <ul className="space-y-1 text-sm">
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Last 24 hours</span>
                      <span className="font-medium">{fmtNum(report.users.new.last24h)}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Last 7 days</span>
                      <span className="font-medium">{fmtNum(report.users.new.last7d)}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Last 30 days</span>
                      <span className="font-medium">{fmtNum(report.users.new.last30d)}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Listings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  Jobs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-2xl font-bold">{fmtNum(report.listings.jobs.total)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Total</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{fmtNum(report.listings.jobs.last30d)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">30d</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{fmtNum(report.listings.jobs.last7d)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">7d</p>
                  </div>
                </div>
                <div>
                  <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2">By status</h5>
                  <StatusList items={report.listings.jobs.byStatus} />
                </div>
                <div>
                  <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Top categories</h5>
                  <CategoryList items={report.listings.jobs.topCategories} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wrench className="w-4 h-4 text-teal-600" />
                  Services
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-2xl font-bold">{fmtNum(report.listings.services.total)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Total</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{fmtNum(report.listings.services.last30d)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">30d</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{fmtNum(report.listings.services.last7d)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">7d</p>
                  </div>
                </div>
                <div>
                  <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2">By status</h5>
                  <StatusList items={report.listings.services.byStatus} />
                </div>
                <div>
                  <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Top categories</h5>
                  <CategoryList items={report.listings.services.topCategories} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShoppingBag className="w-4 h-4 text-purple-600" />
                  Products
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-2xl font-bold">{fmtNum(report.listings.products.total)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Total</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{fmtNum(report.listings.products.last30d)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">30d</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{fmtNum(report.listings.products.last7d)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">7d</p>
                  </div>
                </div>
                <div>
                  <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2">By status</h5>
                  <StatusList items={report.listings.products.byStatus} />
                </div>
                <div>
                  <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Top categories</h5>
                  <CategoryList items={report.listings.products.topCategories} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Orders + transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="w-4 h-4" />
                  Orders & purchases
                </CardTitle>
                <CardDescription>Total user spend on services and digital products.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Service orders</p>
                    <p className="text-xl font-bold">{fmtNum(report.orders.serviceOrders.count)}</p>
                    <p className="text-xs text-muted-foreground">
                      Volume: {fmtBr(report.orders.serviceOrders.volume)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      30d: {fmtNum(report.orders.serviceOrders.last30dCount)} ·{' '}
                      {fmtBr(report.orders.serviceOrders.last30dVolume)}
                    </p>
                  </div>
                  <div className="border border-border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Digital purchases</p>
                    <p className="text-xl font-bold">{fmtNum(report.orders.digitalPurchases.count)}</p>
                    <p className="text-xs text-muted-foreground">
                      Volume: {fmtBr(report.orders.digitalPurchases.volume)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      30d: {fmtNum(report.orders.digitalPurchases.last30dCount)} ·{' '}
                      {fmtBr(report.orders.digitalPurchases.last30dVolume)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Coins className="w-4 h-4 text-yellow-600" />
                  Wallet activity
                </CardTitle>
                <CardDescription>Top-ups, withdrawals, transfers and platform fees.</CardDescription>
              </CardHeader>
              <CardContent>
                {report.transactions.wallet.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No wallet transactions recorded.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground uppercase">
                        <th className="py-1">Type</th>
                        <th className="py-1 text-right">Count</th>
                        <th className="py-1 text-right">Volume</th>
                        <th className="py-1 text-right">Fees</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {report.transactions.wallet.map((w) => (
                        <tr key={w.type}>
                          <td className="py-2 capitalize">{w.type.replace('_', ' ')}</td>
                          <td className="py-2 text-right">{fmtNum(w.count)}</td>
                          <td className="py-2 text-right">{fmtBr(w.volume)}</td>
                          <td className="py-2 text-right">{w.fees ? fmtBr(w.fees) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Disputes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Disputes
              </CardTitle>
              <CardDescription>
                {fmtNum(report.disputes.total)} dispute{report.disputes.total === 1 ? '' : 's'} recorded.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report.disputes.total === 0 ? (
                <p className="text-sm text-muted-foreground">No disputes have been raised yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {report.disputes.byStatus.map((s) => (
                    <div key={s.status} className="border border-border rounded-lg p-3">
                      <p className="text-xs text-muted-foreground capitalize">{s.status}</p>
                      <p className="text-xl font-bold mt-0.5">{fmtNum(s.count)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top contributors */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-600" />
                  Top freelancers
                </CardTitle>
                <CardDescription>By lifetime earnings.</CardDescription>
              </CardHeader>
              <CardContent>
                {report.top.freelancers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No earning freelancers yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {report.top.freelancers.map((f, i) => (
                      <li key={f.id} className="flex items-center justify-between text-sm">
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {i + 1}. {f.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ★ {f.rating.toFixed(1)} · {fmtNum(f.completedProjects)} projects
                          </p>
                        </div>
                        <span className="font-semibold whitespace-nowrap">{fmtBr(f.earnings)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Top clients
                </CardTitle>
                <CardDescription>By total spend.</CardDescription>
              </CardHeader>
              <CardContent>
                {report.top.clients.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No spending clients yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {report.top.clients.map((c, i) => (
                      <li key={c.id} className="flex items-center justify-between text-sm">
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {i + 1}. {c.name}
                          </p>
                          <p className="text-xs text-muted-foreground">{fmtNum(c.orders)} orders</p>
                        </div>
                        <span className="font-semibold whitespace-nowrap">{fmtBr(c.spent)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-purple-600" />
                  Top sellers
                </CardTitle>
                <CardDescription>By revenue from digital sales.</CardDescription>
              </CardHeader>
              <CardContent>
                {report.top.sellers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sellers with sales yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {report.top.sellers.map((s, i) => (
                      <li key={s.id} className="flex items-center justify-between text-sm">
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {i + 1}. {s.name}
                          </p>
                          <p className="text-xs text-muted-foreground">{fmtNum(s.sales)} sales</p>
                        </div>
                        <span className="font-semibold whitespace-nowrap">{fmtBr(s.revenue)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
