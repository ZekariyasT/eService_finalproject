'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Activity,
  Briefcase,
  Wrench,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { apiFetch } from '@/lib/api'
import { 
  Area, 
  AreaChart, 
  Bar, 
  BarChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Tooltip, 
  Cell, 
  Pie, 
  PieChart,
  LabelList
} from 'recharts'
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent, 
  ChartLegend, 
  ChartLegendContent,
  type ChartConfig
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'

type Stats = {
  users: number
  services: number
  products: number
  serviceOrders: number
  openDisputes: number
  charts: {
    userGrowth: { date: string; count: number }[]
    orderTrends: { date: string; count: number; revenue: number }[]
    roleDistribution: { role: string; count: number }[]
    categoryDistribution: { category: string; count: number }[]
  }
}

const chartConfig: ChartConfig = {
  users: {
    label: "Users",
    color: "hsl(var(--chart-1))",
  },
  orders: {
    label: "Orders",
    color: "hsl(var(--chart-2))",
  },
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-3))",
  },
  roles: {
    label: "Roles",
    color: "hsl(var(--chart-4))",
  },
}

type RecentActivityItem = {
  kind: 'job' | 'service' | 'product'
  id: string
  title: string
  authorName: string
  authorId: string
  category?: string
  amount?: number
  status: string
  createdAt: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<RecentActivityItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [statsRes, recentRes] = await Promise.all([
          apiFetch<Stats>('/admin/stats'),
          apiFetch<{ items: RecentActivityItem[] }>('/admin/recent-activity').catch(
            () => ({ items: [] as RecentActivityItem[] })
          ),
        ])
        if (!cancelled) {
          setStats(statsRes)
          setRecent(recentRes.items || [])
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load stats')
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[400px] lg:col-span-2 rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    )
  }

  const kpis = [
    { 
      label: 'Total Users', 
      value: stats?.users ?? 0, 
      icon: Users, 
      trend: '+12%', 
      trendUp: true,
      color: 'bg-blue-500/10 text-blue-500'
    },
    { 
      label: 'Service Orders', 
      value: stats?.serviceOrders ?? 0, 
      icon: CreditCard, 
      trend: '+5%', 
      trendUp: true,
      color: 'bg-primary/10 text-primary'
    },
    { 
      label: 'Active Listings', 
      value: (stats?.services ?? 0) + (stats?.products ?? 0), 
      icon: Package, 
      trend: '+18%', 
      trendUp: true,
      color: 'bg-purple-500/10 text-purple-500'
    },
    { 
      label: 'Open Disputes', 
      value: stats?.openDisputes ?? 0, 
      icon: AlertTriangle, 
      trend: '-2%', 
      trendUp: false,
      color: 'bg-orange-500/10 text-orange-500'
    },
  ]

  const userGrowthData = stats?.charts.userGrowth.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    users: d.count
  })) || []

  const orderTrendsData = stats?.charts.orderTrends.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    orders: d.count,
    revenue: Number(d.revenue)
  })) || []

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Comprehensive platform overview and analytics.</p>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 text-destructive flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="overflow-hidden border-none bg-card shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${kpi.color}`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${kpi.trendUp ? 'text-primary' : 'text-orange-600'}`}>
                  {kpi.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {kpi.trend}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                <h3 className="text-2xl font-bold mt-1">{kpi.value.toLocaleString()}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Growth Chart */}
        <Card className="lg:col-span-2 shadow-sm border-none">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Platform Growth
            </CardTitle>
            <CardDescription>User registrations and orders over the last 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <AreaChart data={orderTrendsData.length > 0 ? orderTrendsData : [{date: 'No Data', orders: 0}]}>
                <defs>
                  <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-orders)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-orders)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tickMargin={10} 
                  tick={{ fontSize: 12 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tickMargin={10} 
                  tick={{ fontSize: 12 }} 
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="orders"
                  stroke="var(--color-orders)"
                  fillOpacity={1}
                  fill="url(#fillOrders)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Role Distribution Chart */}
        <Card className="shadow-sm border-none">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              User Roles
            </CardTitle>
            <CardDescription>Distribution of active users.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={stats?.charts.roleDistribution || []}
                  dataKey="count"
                  nameKey="role"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                >
                  {stats?.charts.roleDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="role" />} className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center" />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="shadow-sm border-none">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Revenue Analysis
          </CardTitle>
          <CardDescription>Daily gross transaction volume.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={orderTrendsData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tickMargin={10} 
                tick={{ fontSize: 12 }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tickMargin={10} 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar 
                dataKey="revenue" 
                fill="var(--color-revenue)" 
                radius={[4, 4, 0, 0]} 
                barSize={30}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Recent Posts (jobs / services / products) */}
      <Card className="shadow-sm border-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Recent posts on the platform</CardTitle>
            <CardDescription>Latest jobs, freelancer services and digital products posted by users.</CardDescription>
          </div>
          <Link
            href="/admin/products"
            className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
          >
            View all <ArrowUpRight className="w-3 h-3" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b">
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Title</th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">By</th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Category</th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Amount</th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">When</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {recent.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No posts yet.
                    </td>
                  </tr>
                )}
                {recent.slice(0, 12).map((item) => {
                  const palette =
                    item.kind === 'job'
                      ? { className: 'bg-blue-100 text-blue-700', Icon: Briefcase, label: 'Job' }
                      : item.kind === 'service'
                        ? { className: 'bg-teal-100 text-teal-700', Icon: Wrench, label: 'Service' }
                        : { className: 'bg-purple-100 text-purple-700', Icon: ShoppingBag, label: 'Product' }
                  const { Icon } = palette
                  return (
                    <tr key={`${item.kind}-${item.id}`} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-3 align-middle">
                        <Badge className={`border-0 ${palette.className}`}>
                          <Icon className="w-3 h-3 mr-1" />
                          {palette.label}
                        </Badge>
                      </td>
                      <td className="p-3 align-middle font-medium max-w-[16rem] truncate">{item.title}</td>
                      <td className="p-3 align-middle text-muted-foreground">{item.authorName || '—'}</td>
                      <td className="p-3 align-middle text-muted-foreground">{item.category || '—'}</td>
                      <td className="p-3 align-middle">
                        {typeof item.amount === 'number' && item.amount > 0
                          ? `Br ${item.amount.toLocaleString('en-US')}`
                          : '—'}
                      </td>
                      <td className="p-3 align-middle text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Info */}
      <Card className="border-none bg-primary/5 p-6">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-2">Management Controls</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              As an administrator, you have full oversight of platform activities. Use the sidebar to manage users,
              review pending disputes, moderate listings, and oversee payment activity.
            </p>
          </div>
          <div className="flex gap-3">
             <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
             <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">System Online</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
