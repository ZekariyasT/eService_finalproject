'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Users,
  ShoppingBag,
  CreditCard,
  Settings,
  LogOut,
  AlertTriangle,
  MessageSquare,
  FileText,
  Bell,
  Inbox,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { NotificationMenu } from '@/components/layout/notification-menu'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import { useDashboardBadges } from '@/components/layout/dashboard-badges-context'
import Image from 'next/image'

type Item = {
  icon: typeof BarChart3
  label: string
  href: string
  /** When set, show unread count badge (same source as dashboard sidebar). */
  showNotificationBadge?: boolean
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

export function AdminSidebar() {
  const pathname = usePathname()
  const { logout } = useAuth()
  const { notificationUnread } = useDashboardBadges()

  const menuItems: Item[] = [
    { icon: BarChart3, label: 'Dashboard', href: '/admin/dashboard' },
    { icon: Users, label: 'Manage Users', href: '/admin/users' },
    { icon: ShoppingBag, label: 'Manage Listings', href: '/admin/products' },
    { icon: CreditCard, label: 'Payments & Escrow', href: '/admin/payments' },
    { icon: AlertTriangle, label: 'Disputes', href: '/admin/disputes' },
    { icon: Inbox, label: 'Contact inbox', href: '/admin/contact-messages' },
    { icon: MessageSquare, label: 'Messages', href: '/admin/messages' },
    {
      icon: Bell,
      label: 'Notifications',
      href: '/admin/notifications',
      showNotificationBadge: true,
    },
    { icon: FileText, label: 'Reports', href: '/admin/reports' },
    { icon: Settings, label: 'Settings', href: '/admin/settings' },
  ]

  const linkActive = (href: string) => {
    if (pathname === href) return true
    if (href !== '/admin/dashboard' && pathname?.startsWith(href)) return true
    return false
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border p-6 overflow-y-auto">
      <div className="flex items-center justify-between gap-2 mb-6">
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity shrink-0">
          <Image src="/logo.png" alt="Elite Ethiopia" width={40} height={40} className="w-10 h-10" />
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          <NotificationMenu variant="dark" />
          <LanguageSwitcher variant="cardHeader" />
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-1">Administrator</p>
      <h2 className="text-sm font-bold text-muted-foreground mb-6 uppercase">Admin Panel</h2>

      <nav className="space-y-2 mb-8">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
              linkActive(item.href) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">{item.label}</span>
            {item.showNotificationBadge ? <NavBadge count={notificationUnread} /> : null}
          </Link>
        ))}
      </nav>

      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  )
}
