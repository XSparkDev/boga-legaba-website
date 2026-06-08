import type { Metadata } from 'next'
import { v2Path } from '@v2/lib/paths'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { PageHeader } from '@v2/components/page-header'
import { Reveal } from '@v2/components/reveal'

export const metadata: Metadata = {
  title: 'Specials & Offers',
  description:
    'Current specials and seasonal offers at Boga Legaba Guest House Mahikeng — direct booking benefits and corporate packages.',
}

const specials = [
  {
    title: 'Direct Booking Advantage',
    detail:
      'Book on our site or via NightsBridge and skip OTA fees — best available rates with instant confirmation.',
  },
  {
    title: 'Extended Stay',
    detail:
      'Staying three nights or more? Ask about preferential rates for long visits and project teams in Mahikeng.',
  },
  {
    title: 'Government & Corporate',
    detail:
      'Structured procurement with VAT invoices, PO support and per diem alignment for qualifying departments.',
  },
]

export default function SpecialsPage() {
  return (
    <main>
      <PageHeader
        label="Specials"
        title="Offers worth booking for."
        subtitle="Seasonal promotions and direct-booking benefits across all three properties."
      />

      <section className="bg-cream py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 md:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            {specials.map((s, i) => (
              <Reveal key={s.title} delay={i * 80}>
                <div className="h-full rounded-2xl bg-off-white p-7 shadow-[0_4px_24px_rgba(44,26,14,0.08)]">
                  <h2 className="font-display text-2xl italic text-deep-earth">{s.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-brown">{s.detail}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={120} className="mt-12 text-center">
            <p className="text-sm text-muted-brown">
              For current seasonal promotions, contact reception or chat on WhatsApp.
            </p>
            <Link
              href={v2Path("/book-now")}
              className="group mt-6 inline-flex items-center gap-2 rounded-full bg-terracotta px-8 py-3.5 font-sans text-sm font-medium text-white transition-colors hover:bg-terracotta-light"
            >
              Check Availability
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>
      </section>
    </main>
  )
}
