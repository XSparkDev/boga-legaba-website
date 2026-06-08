import type { Metadata } from 'next'
import { Check } from 'lucide-react'
import { SiteImage } from '@v2/components/site-image'
import { Reveal } from '@v2/components/reveal'
import { Counter } from '@v2/components/counter'
import { ConferencePackages } from '@v2/components/conference/conference-packages'
import { ConferenceForm } from '@v2/components/forms/conference-form'
import { WhatsAppIcon } from '@v2/components/whatsapp-icon'
import { getSiteImage } from '@v2/data/images'
import { PHONE, waLink } from '@v2/data/site'

export const metadata: Metadata = {
  title: 'Conference Venue in Mahikeng — Up to 80 Delegates',
  description:
    'A conference venue in Mahikeng for up to 80 delegates with full AV, catering and on-site accommodation. Enquire about your next corporate or government event.',
}

const capacity = [
  { value: '80', label: 'Delegates max', counter: 80 },
  { value: '5', label: 'Room setups', counter: 5 },
  { value: 'Full', label: 'AV included' },
  { value: 'On-site', label: 'Catering' },
  { value: '27', label: 'Accommodation rooms', counter: 27 },
]

const checkpoints = [
  'Flexible room setups for any agenda',
  'Full AV — projector, screen, sound',
  'In-house and bespoke catering',
  'On-site accommodation for delegates',
  'Dedicated event coordinator',
]

const conferenceHero = getSiteImage('conference-hero')

export default function ConferencePage() {
  return (
    <main>
      <section className="relative h-[80vh] min-h-[560px] w-full overflow-hidden">
        <SiteImage
          src={conferenceHero.src}
          alt={conferenceHero.alt}
          priority
          className="absolute inset-0 h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-deep-earth via-deep-earth/40 to-transparent" />
        <div className="pattern-stripe absolute top-1/2 left-0" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-6 pb-14 md:px-8">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-warm-sand">
              Conference Venue
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-5xl italic font-bold leading-[0.95] text-white text-balance md:text-7xl">
              Your next event. Our best work.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-cream/80">
              Up to 80 delegates. Full AV. Catering. Accommodation on-site.
            </p>
            <a
              href="#enquiry"
              className="mt-7 inline-block rounded-full bg-terracotta px-7 py-4 font-sans font-medium text-white transition-colors hover:bg-terracotta-light"
            >
              Check Availability
            </a>
          </Reveal>
        </div>
      </section>

      <section className="bg-warm-sand py-12">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-10 px-6 md:grid-cols-5 md:px-8">
          {capacity.map((c) => (
            <div key={c.label} className="text-center">
              <div className="font-display text-4xl font-bold text-terracotta md:text-5xl">
                {c.counter ? <Counter to={c.counter} /> : c.value}
              </div>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.15em] text-body-brown">
                {c.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="enquiry" className="scroll-mt-24">
        <div className="grid lg:grid-cols-2">
          <div className="diagonal-texture bg-deep-earth px-6 py-16 md:px-12 md:py-24">
            <Reveal>
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-terracotta">
                Why Book With Us
              </p>
              <h2 className="mt-4 font-display text-4xl font-light leading-tight text-white md:text-5xl">
                We&apos;ve hosted hundreds of corporate events.
              </h2>
              <ul className="mt-8 space-y-4">
                {checkpoints.map((c) => (
                  <li key={c} className="flex items-start gap-3 text-cream/85">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-terracotta" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-10 max-w-md font-display text-xl italic text-cream/90">
                &ldquo;Professional venue, seamless coordination, and great value for our
                department&apos;s annual planning session.&rdquo;
              </p>
              <a
                href={waLink('lantana', 'I would like to enquire about the conference venue.')}
                target="_blank"
                rel="noopener noreferrer"
                data-ga4-event="whatsapp_click"
                data-ga4-property="lantana"
                className="mt-8 inline-flex items-center gap-2 text-sm text-warm-sand hover:text-terracotta"
              >
                <WhatsAppIcon className="h-5 w-5 text-[#25d366]" />
                WhatsApp the events desk · {PHONE}
              </a>
            </Reveal>
          </div>

          <div className="bg-cream px-6 py-16 md:px-12 md:py-24">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-terracotta">
              Conference Enquiry
            </p>
            <h2 className="mt-3 mb-8 font-display text-3xl italic text-deep-earth md:text-4xl">
              Tell us about your event
            </h2>
            <ConferenceForm />
          </div>
        </div>
      </section>

      <section className="bg-off-white py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-6 md:px-8">
          <ConferencePackages />
        </div>
      </section>
    </main>
  )
}
