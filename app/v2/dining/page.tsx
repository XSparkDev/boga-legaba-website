import type { Metadata } from 'next'
import { UtensilsCrossed, PartyPopper, TreePalm, Wine } from 'lucide-react'
import { Reveal } from '@v2/components/reveal'
import { SiteImage } from '@v2/components/site-image'
import { InterestForm } from '@v2/components/forms/interest-form'
import { getSiteImage } from '@v2/data/images'

export const metadata: Metadata = {
  title: 'Dining & Events at Lantana — Coming Soon',
  description:
    'Dining and events experiences coming soon at Lantana, Mahikeng. Register your interest for our restaurant, private events, outdoor space and bar.',
}

const experiences = [
  {
    icon: UtensilsCrossed,
    title: 'Dining',
    desc: 'A relaxed restaurant serving local and continental favourites.',
    imageKey: 'dining-restaurant' as const,
  },
  {
    icon: PartyPopper,
    title: 'Private Events',
    desc: 'Celebrations, functions and intimate gatherings.',
    imageKey: 'dining-private-events' as const,
  },
  {
    icon: TreePalm,
    title: 'Outdoor',
    desc: 'Garden seating and open-air spaces for warm Mahikeng evenings.',
    imageKey: 'dining-outdoor' as const,
  },
  {
    icon: Wine,
    title: 'Bar',
    desc: 'A welcoming bar for guests and locals alike.',
    imageKey: 'dining-bar' as const,
  },
]

export default function DiningPage() {
  return (
    <main className="bg-cream">
      <section className="relative overflow-hidden pb-16 pt-36 md:pb-20 md:pt-44">
        <div className="mx-auto max-w-7xl px-6 md:px-8">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-terracotta">
              Dining & Events · Lantana
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-5xl italic font-bold leading-[0.95] text-deep-earth text-balance md:text-7xl">
              More than a stay — experiences at Lantana.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-body-brown">
              We&apos;re building something special at our Lantana property. Dining, events and
              outdoor experiences are on the way.
            </p>
          </Reveal>
        </div>
      </section>

      <div className="pattern-stripe mx-auto max-w-7xl" />

      <section className="py-16 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 md:grid-cols-2 md:px-8 lg:grid-cols-4">
          {experiences.map((e, i) => {
            const image = getSiteImage(e.imageKey)
            return (
              <Reveal key={e.title} delay={i * 80}>
                <div className="group h-full overflow-hidden rounded-2xl bg-off-white shadow-[0_4px_24px_rgba(44,26,14,0.08)]">
                  <SiteImage src={image.src} alt={image.alt} className="h-40 w-full" />
                  <div className="p-6">
                    <div className="flex items-center gap-3">
                      <e.icon className="h-6 w-6 text-terracotta" />
                      <h3 className="font-display text-2xl italic text-deep-earth">{e.title}</h3>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-body-brown">{e.desc}</p>
                    <span className="mt-4 inline-block rounded-full bg-warm-sand px-3 py-1 font-mono text-[9px] uppercase tracking-[0.15em] text-body-brown">
                      Coming Soon
                    </span>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>

      <section className="bg-deep-earth py-20 md:py-24">
        <div className="diagonal-texture mx-auto max-w-3xl px-6 text-center md:px-8">
          <Reveal>
            <h2 className="font-display text-3xl italic text-white md:text-4xl">
              Register your interest
            </h2>
            <p className="mt-3 text-cream/70">
              Join our mailing list for launch announcements.
            </p>
          </Reveal>
          <Reveal delay={100} className="mx-auto mt-8 max-w-md text-left">
            <div className="rounded-2xl bg-off-white p-6">
              <InterestForm
                withInterest
                interestOptions={['Dining', 'Private Events', 'Outdoor', 'Bar']}
                buttonLabel="Notify Me"
                successMessage="Thank you — we’ll let you know the moment we launch."
              />
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  )
}
