import Image from 'next/image'
import { ReactNode } from 'react'

interface SplitHeroProps {
  badge?: string
  title: string
  description: string
  image: string
  imageAlt: string
  cta?: ReactNode
  /**
   * Optional highlight word(s) in the title that get rendered with a soft
   * teal-to-mint gradient — gives the title a more polished, brand feel.
   */
  titleAccent?: string
}

function renderTitle(title: string, accent?: string) {
  if (!accent) return title
  const idx = title.indexOf(accent)
  if (idx === -1) return title
  return (
    <>
      {title.slice(0, idx)}
      <span className="bg-gradient-to-r from-[#8fe9e2] via-white to-[#8fe9e2] bg-clip-text text-transparent">
        {accent}
      </span>
      {title.slice(idx + accent.length)}
    </>
  )
}

export function SplitHero({ badge, title, description, image, imageAlt, cta, titleAccent }: SplitHeroProps) {
  return (
    <section className="relative pb-16 pt-32 md:pb-28 md:pt-40 overflow-hidden bg-gradient-to-br from-[#063f3d] via-[#0A5B59] to-[#00786F]">
      {/* Decorative gradient blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#00786F] opacity-40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 right-[-10%] h-[28rem] w-[28rem] rounded-full bg-[#8fe9e2] opacity-20 blur-3xl"
      />
      {/* Subtle grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.4)_1px,transparent_1px)] [background-size:48px_48px]"
      />

      <div className="container relative mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="text-white">
            {badge && (
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-1.5 rounded-full mb-6 w-fit border border-white/25 shadow-[0_4px_30px_rgba(0,0,0,0.15)]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8fe9e2] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                </span>
                <span className="text-xs md:text-sm font-medium tracking-wide text-white">{badge}</span>
              </div>
            )}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 text-white drop-shadow-[0_2px_30px_rgba(0,0,0,0.25)]">
              {renderTitle(title, titleAccent)}
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-teal-50/95 mb-8 leading-relaxed max-w-xl">
              {description}
            </p>
            {cta && <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">{cta}</div>}
          </div>

          {/* Right Image — framed, with a soft glow and accent corner */}
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-[#8fe9e2]/30 via-white/5 to-[#00786F]/30 blur-2xl"
            />
            <div className="relative h-80 md:h-[28rem] rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)]">
              <Image
                src={image}
                alt={imageAlt}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-[#0A5B59]/40 via-transparent to-transparent" />
              {/* Floating accent badge in the corner */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 text-white shadow-lg">
                <div className="relative h-9 w-[5.25rem] shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src="/logo-header.png"
                    alt=""
                    fill
                    sizes="84px"
                    className="object-contain object-left drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight truncate">Elite Ethiopia</p>
                  <p className="text-[11px] text-teal-50/80 leading-tight truncate">
                    Ethiopia&apos;s premier marketplace
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
