import {
  BadgeCheck,
  Globe2,
  LayoutDashboard,
  Shield,
  Sparkles,
  Wallet,
} from 'lucide-react'

const REASONS = [
  {
    icon: Globe2,
    title: 'Built for Ethiopia & beyond',
    description:
      'Access skilled freelancers and serious clients in one place—whether you are hiring locally or collaborating across borders.',
  },
  {
    icon: Shield,
    title: 'Structured hiring & delivery',
    description:
      'Post jobs, compare proposals, agree on contracts, and approve work in clear steps so expectations stay aligned.',
  },
  {
    icon: Wallet,
    title: 'Payments you can track',
    description:
      'Use the built-in wallet and order flows to see where money is held, released, and recorded—no guessing.',
  },
  {
    icon: BadgeCheck,
    title: 'Roles that fit real businesses',
    description:
      'Clients, freelancers, and sellers each get dashboards tailored to how they work—not a one-size-fits-all form.',
  },
  {
    icon: LayoutDashboard,
    title: 'Services and digital products',
    description:
      'Hire for projects and discover digital goods on the same platform when you need both talent and assets.',
  },
  {
    icon: Sparkles,
    title: 'Support when it matters',
    description:
      'Disputes and notifications are built into the product so issues can be surfaced and reviewed instead of lost in chat.',
  },
] as const

export function WhyChooseEliteSection() {
  return (
    <section className="bg-muted/40 py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Why choose Elite Ethiopia services?
          </h2>
          <p className="mt-3 text-muted-foreground text-pretty">
            A marketplace focused on clarity—from first brief to final payment—so teams and freelancers can work together
            with confidence.
          </p>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {REASONS.map(({ icon: Icon, title, description }) => (
            <li
              key={title}
              className="rounded-xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-600/10 text-teal-700 dark:text-teal-400">
                <Icon className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold leading-snug">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
