'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Wallet,
  User,
  MessageSquare,
  Settings,
  HelpCircle,
  ShoppingCart,
  Coins,
  Package,
  BarChart3,
  ClipboardList,
  GraduationCap,
  LogOut,
  Home,
  ShieldAlert,
  Mail,
  Bell,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDashboardBadges } from '@/components/layout/dashboard-badges-context'
import { LanguageSwitcher } from '@/components/layout/language-switcher'

interface SidebarItem {
  name: string
  href: string
  icon: React.ReactNode
  badgeSource?: 'messages' | 'notifications'
}

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null
  const label = count > 99 ? '99+' : String(count)
  return (
    <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
      {label}
    </span>
  )
}

export function DashboardSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { notificationUnread, messageUnread } = useDashboardBadges()

  const badgeFor = (item: SidebarItem): number => {
    if (item.badgeSource === 'messages') return messageUnread
    if (item.badgeSource === 'notifications') return notificationUnread
    return 0
  }

  const freelancerItems: SidebarItem[] = [
    { name: 'Dashboard', href: '/dashboard/freelancer/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Find Jobs', href: '/dashboard/freelancer/find-jobs', icon: <Briefcase className="w-5 h-5" /> },
    { name: 'Proposals', href: '/dashboard/freelancer/proposals', icon: <FileText className="w-5 h-5" /> },
    { name: 'Invitations', href: '/dashboard/freelancer/invitations', icon: <Mail className="w-5 h-5" /> },
    { name: 'Contracts', href: '/dashboard/freelancer/contracts', icon: <Briefcase className="w-5 h-5" /> },
    { name: 'Earnings', href: '/dashboard/freelancer/wallet', icon: <Wallet className="w-5 h-5" /> },
    { name: 'My courses', href: '/dashboard/my-courses', icon: <GraduationCap className="w-5 h-5" /> },
    { name: 'Profile', href: '/dashboard/freelancer/profile', icon: <User className="w-5 h-5" /> },
    {
      name: 'Messages',
      href: '/dashboard/freelancer/messages',
      icon: <MessageSquare className="w-5 h-5" />,
      badgeSource: 'messages',
    },
    {
      name: 'Notifications',
      href: '/dashboard/notifications',
      icon: <Bell className="w-5 h-5" />,
      badgeSource: 'notifications',
    },
  ]

  const clientItems: SidebarItem[] = [
    { name: 'Dashboard', href: '/dashboard/client/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Post Jobs', href: '/dashboard/client/post-job', icon: <Briefcase className="w-5 h-5" /> },
    { name: 'My Jobs', href: '/dashboard/client/my-jobs', icon: <FileText className="w-5 h-5" /> },
    { name: 'Proposals', href: '/dashboard/client/proposals', icon: <FileText className="w-5 h-5" /> },
    { name: 'Invitations', href: '/dashboard/client/invitations', icon: <Mail className="w-5 h-5" /> },
    { name: 'Contracts', href: '/dashboard/client/contracts', icon: <Briefcase className="w-5 h-5" /> },
    { name: 'Payments', href: '/dashboard/client/payments', icon: <Wallet className="w-5 h-5" /> },
    { name: 'My courses', href: '/dashboard/my-courses', icon: <GraduationCap className="w-5 h-5" /> },
    { name: 'Buy', href: '/dashboard/client/cart', icon: <ShoppingCart className="w-5 h-5" /> },
    { name: 'Coins', href: '/dashboard/client/rewards', icon: <Coins className="w-5 h-5" /> },
    { name: 'Profile', href: '/dashboard/client/profile', icon: <User className="w-5 h-5" /> },
    {
      name: 'Messages',
      href: '/dashboard/client/messages',
      icon: <MessageSquare className="w-5 h-5" />,
      badgeSource: 'messages',
    },
    {
      name: 'Notifications',
      href: '/dashboard/notifications',
      icon: <Bell className="w-5 h-5" />,
      badgeSource: 'notifications',
    },
  ]

  const sellerItems: SidebarItem[] = [
    { name: 'Dashboard', href: '/dashboard/seller/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Products', href: '/dashboard/seller/products', icon: <Package className="w-5 h-5" /> },
    { name: 'Inventory', href: '/dashboard/seller/inventory', icon: <ClipboardList className="w-5 h-5" /> },
    { name: 'Orders', href: '/dashboard/seller/orders', icon: <FileText className="w-5 h-5" /> },
    { name: 'Analytics', href: '/dashboard/seller/analytics', icon: <BarChart3 className="w-5 h-5" /> },
    { name: 'Wallet', href: '/dashboard/seller/wallet', icon: <Wallet className="w-5 h-5" /> },
    { name: 'My courses', href: '/dashboard/my-courses', icon: <GraduationCap className="w-5 h-5" /> },
    { name: 'Profile', href: '/dashboard/seller/profile', icon: <User className="w-5 h-5" /> },
    {
      name: 'Messages',
      href: '/dashboard/seller/messages',
      icon: <MessageSquare className="w-5 h-5" />,
      badgeSource: 'messages',
    },
    {
      name: 'Notifications',
      href: '/dashboard/notifications',
      icon: <Bell className="w-5 h-5" />,
      badgeSource: 'notifications',
    },
  ]

  const items =
    user?.role === 'freelancer'
      ? freelancerItems
      : user?.role === 'seller'
        ? sellerItems
        : clientItems
  const portalName =
    user?.role === 'freelancer' ? 'Freelancer' : user?.role === 'seller' ? 'Seller' : 'Client'
  const commonItems: SidebarItem[] = [
    { name: 'Disputes', href: '/dashboard/disputes', icon: <ShieldAlert className="w-5 h-5" /> },
    { name: 'Settings', href: '/dashboard/settings', icon: <Settings className="w-5 h-5" /> },
    { name: 'Help & Support', href: '/dashboard/help', icon: <HelpCircle className="w-5 h-5" /> },
  ]

  const linkClass = (href: string) =>
    cn(
      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
      pathname === href ? 'bg-teal-500 text-white' : 'text-white/90 hover:bg-white/15 hover:text-white'
    )

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-[#0A5B59] border-r border-white/10">
      <div className="shrink-0 border-b border-white/10 px-6 pt-6 pb-4 flex items-start justify-between gap-3">
        <h2 className="font-bold text-lg text-white min-w-0">{portalName} Portal</h2>
        <LanguageSwitcher variant="tealSidebar" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <nav className="space-y-2">
          {items.map((item) => (
            <Link key={item.href + item.name} href={item.href} className={linkClass(item.href)}>
              {item.icon}
              <span className="text-sm font-medium">{item.name}</span>
              <NavBadge count={badgeFor(item)} />
            </Link>
          ))}

          <hr className="my-4 border-white/15" />

          {commonItems.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href)}>
              {item.icon}
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="shrink-0 border-t border-white/10 px-6 pb-6 pt-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-white/90 transition-colors hover:bg-white/15 hover:text-white"
              aria-label="Open profile menu"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white">
                {user?.name?.charAt(0).toUpperCase() ?? <User className="h-5 w-5" />}
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-medium text-white">
                  {user?.name ?? 'Profile'}
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Go to home page
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
