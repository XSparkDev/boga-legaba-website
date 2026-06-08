import { Building2, CalendarCheck, Briefcase, MessageCircle } from 'lucide-react'
import { Reveal } from '@v2/components/reveal'

const features = [
  {
    num: '01',
    icon: Building2,
    title: 'Multiple Properties',
    desc: '27 rooms across 3 addresses, all on one booking system.',
  },
  {
    num: '02',
    icon: CalendarCheck,
    title: 'NightsBridge Direct',
    desc: 'No OTA fees, instant availability and best-rate bookings.',
  },
  {
    num: '03',
    icon: Briefcase,
    title: 'Corporate Ready',
    desc: 'PO support, VAT invoices and government per diem rates.',
  },
  {
    num: '04',
    icon: MessageCircle,
    title: 'WhatsApp Desk',
    desc: 'A direct line to each property team, always followed up.',
  },
]

export function WhyChoose() {
  return (
    <section className="grain-surface bg-warm-sand py-20 md:py-28">
      <div className="relative z-[2] mx-auto max-w-7xl px-6 md:px-8">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-terracotta">
            Why Choose Us
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 max-w-2xl font-display text-4xl font-light leading-tight text-deep-earth text-balance md:text-5xl">
            Built for business. Designed for comfort.
          </h2>
        </Reveal>

        <div className="no-scrollbar -mx-6 mt-14 flex gap-6 overflow-x-auto px-6 pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
          {features.map((f, i) => (
            <Reveal
              key={f.num}
              delay={i * 100}
              className="relative w-[260px] shrink-0 md:w-auto"
            >
              <span className="pointer-events-none absolute -top-6 right-0 font-display text-7xl font-bold text-terracotta/15">
                {f.num}
              </span>
              <f.icon className="relative h-9 w-9 text-terracotta" />
              <h3 className="relative mt-5 font-sans text-lg font-medium text-deep-earth">
                {f.title}
              </h3>
              <p className="relative mt-2 text-sm leading-relaxed text-body-brown">{f.desc}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
