import { Reveal } from "@/components/reveal"

export function StayPageHeader() {
  return (
    <section className="relative overflow-hidden pb-14 pt-28 text-white lg:pb-20 lg:pt-36">
      {/* Background hero image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero-exterior.png"
        alt=""
        aria-hidden
        width={1920}
        height={1080}
        loading="eager"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      {/* Flat semi-transparent overlay for text legibility — brand guide: flat
          color blocks, no gradients. */}
      <div className="absolute inset-0 bg-black/60" />

      <div className="grain-overlay relative z-[1] mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="font-body text-xs uppercase tracking-[0.25em] text-gold">Stay & Rooms</p>
          <h1 className="mt-3 max-w-3xl break-words text-balance font-title text-3xl font-extrabold leading-[1.05] sm:text-4xl lg:text-5xl xl:text-6xl">
            Find Your Perfect Room
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-white/70 lg:text-lg">
            Browse live room inventory synced from NightsBridge. Select a property and check your dates
            to see what is available.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
