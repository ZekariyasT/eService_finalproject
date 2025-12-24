'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X, ShoppingCart, Settings, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationMenu } from '@/components/layout/notification-menu'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import { TranslatedText } from '@/lib/translation-context'

export function MainNav() {
  const { user, isAuthenticated, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  const publicLinks = [
    { href: '/', label: 'Home', isActive: (p: string) => p === '/' },
    { href: '/about', label: 'About Us', isActive: (p: string) => p.startsWith('/about') },
    { href: '/services', label: 'Expertise', isActive: (p: string) => p.startsWith('/services') },
    { href: '/products', label: 'Projects', isActive: (p: string) => p.startsWith('/products') },
    { href: '/contact', label: 'Contact', isActive: (p: string) => p.startsWith('/contact') },
  ]

  const navItemClass = (active: boolean) =>
    [
      'text-sm font-semibold px-4 py-2 rounded-full transition-colors',
      active ? 'bg-teal-500 text-white' : 'text-white/90 hover:text-white hover:bg-white/15',
    ].join(' ')

  const desktopNavWrapperClass =
    'hidden md:flex items-center rounded-full bg-white/10 p-1 gap-1'

  const getDashboardLink = () => {
    if (!user) return '/dashboard/freelancer/dashboard'
    if (user.role === 'freelancer') return '/dashboard/freelancer/dashboard'
    if (user.role === 'client') return '/dashboard/client/dashboard'
    if (user.role === 'seller') return '/dashboard/seller/dashboard'
    if (user.role === 'admin' || user.role === 'super-admin') return '/admin/dashboard'
    return '/dashboard/freelancer/dashboard'
  }

  const getProfileLink = () => {
    if (user?.role === 'freelancer') return '/dashboard/freelancer/profile'
    if (user?.role === 'seller') return '/dashboard/seller/profile'
    return '/dashboard/client/profile'
  }

  return (
    <nav className="fixed top-0 left-0 z-50 w-full">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="bg-[#0A5B59] rounded-full px-6 py-3 flex items-center justify-between shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <Image
              src="/logo-header.png"
              alt="Elite Ethiopia"
              width={150}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </Link>

          {/* Desktop Navigation — public pages + Dashboard; Post Jobs / Buy / Messages live in dashboard sidebar */}
          <div className={`${desktopNavWrapperClass} flex-wrap justify-center max-w-[min(100%,52rem)]`}>
            {publicLinks.map((l) => (
              <Link key={l.href} href={l.href} className={navItemClass(l.isActive(pathname || ''))}>
                <TranslatedText text={l.label} />
              </Link>
            ))}
            {isAuthenticated && (
              <Link
                href={getDashboardLink()}
                className={navItemClass(
                  (pathname ?? '').startsWith('/dashboard') || (pathname ?? '').startsWith('/admin'),
                )}
              >
                <TranslatedText text="Dashboard" />
              </Link>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3 md:gap-4">
            {isAuthenticated ? (
              <>
                <NotificationMenu />
                {user?.role === 'client' && (
                  <Link
                    href="/dashboard/client/cart"
                    className="p-2 hover:bg-white/15 rounded-lg transition-colors"
                    aria-label="Cart"
                  >
                    <ShoppingCart className="w-5 h-5 text-white" />
                  </Link>
                )}

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-10 h-10 rounded-full bg-white/15 text-white font-semibold flex items-center justify-center cursor-pointer hover:bg-white/25 transition-colors">
                      {user?.name?.charAt(0).toUpperCase()}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link
                        href={getProfileLink()}
                      >
                        <TranslatedText text="Profile" />
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/settings">
                        <Settings className="w-4 h-4 mr-2" />
                        <TranslatedText text="Settings" />
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      <TranslatedText text="Logout" />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <LanguageSwitcher variant="darkNav" />
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:text-white hover:bg-white/15"
                  >
                    <TranslatedText text="Log in" />
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    <TranslatedText text="Sign up" />
                  </Button>
                </Link>
                <LanguageSwitcher variant="darkNav" />
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 hover:bg-white/15 rounded-lg transition-colors shrink-0"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0A5B59] p-4 space-y-3">
          {publicLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`block py-2 text-sm font-semibold ${
                l.isActive(pathname || '') ? 'text-white' : 'text-white/90'
              } hover:text-white`}
            >
              <TranslatedText text={l.label} />
            </Link>
          ))}
          {isAuthenticated ? (
            <>
              <hr className="my-2 border-white/20" />
              <Link href={getDashboardLink()} className="block py-2 text-sm font-medium text-white hover:text-white/90">
                <TranslatedText text="Dashboard" />
              </Link>
              <button
                onClick={logout}
                className="w-full text-left py-2 text-sm font-medium text-red-200 hover:text-white"
              >
                <TranslatedText text="Logout" />
              </button>
            </>
          ) : (
            <>
              <hr className="my-2 border-white/20" />
              <Link href="/login" className="block py-2 text-sm font-medium text-white">
                <TranslatedText text="Log in" />
              </Link>
              <Link href="/signup" className="block py-2 text-sm font-medium text-white">
                <TranslatedText text="Sign up" />
              </Link>
              <div className="pt-2">
                <LanguageSwitcher variant="darkNav" />
              </div>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
