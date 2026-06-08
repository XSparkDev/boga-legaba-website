import { Reveal } from '@v2/components/reveal'
import { getSiteImage } from '@v2/data/images'

const conferenceHero = getSiteImage('conference-hero')

export function ConferencePageHeader() {
  return (
    <section className="relative overflow-hidden pb-16 pt-36 md:pb-20 md:pt-44">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={conferenceHero.src}
        alt=""
        aria-hidden
        width={1920}
        height={1080}
        loading="eager"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-deep-earth via-deep-earth/70 to-deep-earth/40" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-transparent to-black/25" />

      <div className="diagonal-texture relative z-[1] mx-auto max-w-7xl px-6 md:px-8">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-warm-sand">
            Conference Venue
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="mt-4 max-w-4xl break-words text-balance font-display text-4xl font-bold italic leading-[0.95] text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Your next event. Our best work.
          </h1>
        </Reveal>
        <Reveal delay={160}>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-cream/80">
            Up to 80 delegates. Full AV. Catering. Accommodation on-site.
          </p>
        </Reveal>
      </div>
      <div className="pattern-stripe absolute bottom-0 left-0" />
    </section>
  )
}
