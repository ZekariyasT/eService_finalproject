import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/auth-context'
import { CartProvider } from '@/lib/cart-context'
import { TranslationProvider } from '@/lib/translation-context'
import { Chatbot } from '@/components/shared/chatbot'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: 'Elite Ethiopia - Freelance Marketplace',
  description: 'Connect with top freelancers and businesses. Hire talent or find your next project on Elite Ethiopia',
  generator: 'v0.app',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <TranslationProvider>
          <AuthProvider>
            <CartProvider>
              {children}
              <Chatbot />
              <Toaster />
            </CartProvider>
          </AuthProvider>
        </TranslationProvider>
        <Analytics />
      </body>
    </html>
  )
}
