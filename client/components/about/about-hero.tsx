'use client'

export function AboutHero() {
  return (
    <section className="relative py-24 md:py-40 overflow-hidden bg-gradient-to-br from-[#0A5B59] via-[#00786F] to-[#065a54]">
      <div className="absolute inset-0 opacity-25">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-[#34bdb3] rounded-full mix-blend-screen filter blur-3xl animate-blob"></div>
        <div className="absolute -bottom-40 right-10 w-80 h-80 bg-[#00786F] rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-[#0A5B59] rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative container mx-auto px-4 text-center">
        <h1 className="text-5xl md:text-7xl font-bold text-balance leading-tight mb-6 text-white">
          About <span className="bg-gradient-to-r from-[#8fe9e2] to-[#c8fff8] bg-clip-text text-transparent">Elite Ethiopia</span>
        </h1>
        <p className="text-lg md:text-2xl text-balance max-w-3xl mx-auto text-teal-50">
          Connecting talented professionals with innovative businesses across Africa. We're building the future of work, one project at a time.
        </p>
      </div>
    </section>
  )
}
