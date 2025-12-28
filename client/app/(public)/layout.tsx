import { MainNav } from '@/components/layout/main-nav'
import { Footer } from '@/components/layout/footer'
import { ReactNode } from 'react'

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MainNav />
      <main className="min-h-screen ">
        {children}
      </main>
      <Footer />
    </>
  )
}
