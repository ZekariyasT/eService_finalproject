import Link from 'next/link'
import {
  Bot,
  BriefcaseBusiness,
  Code2,
  Gavel,
  Landmark,
  Megaphone,
  Palette,
  PenTool,
  Ruler,
  Users,
} from 'lucide-react'

const CATEGORIES = [
  { title: 'AI Services', icon: Bot, href: '/services?category=ai-services' },
  { title: 'Development & IT', icon: Code2, href: '/services?category=development-it' },
  { title: 'Design & Creative', icon: Palette, href: '/services?category=design-creative' },
  { title: 'Sales & Marketing', icon: Megaphone, href: '/services?category=sales-marketing' },
  { title: 'Writing & Translation', icon: PenTool, href: '/services?category=writing-translation' },
  { title: 'Admin & Support', icon: BriefcaseBusiness, href: '/services?category=admin-support' },
  { title: 'Finance & Accounting', icon: Landmark, href: '/services?category=finance-accounting' },
  { title: 'Legal', icon: Gavel, href: '/services?category=legal' },
  { title: 'HR & Training', icon: Users, href: '/services?category=hr-training' },
  { title: 'Engineering & Architecture', icon: Ruler, href: '/services?category=engineering-architecture' },
]

export function FindFreelancersSection() {
  return (
    <section className="bg-background py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Find freelancers for every type of work</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {CATEGORIES.map(({ title, icon: Icon, href }) => (
            <Link
              key={title}
              href={href}
              className="group rounded-lg border border-border bg-card p-6  transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex flex-col gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-100 transition group-hover:bg-teal-100">
                  <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <div className="text-base font-semibold leading-snug">{title}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

