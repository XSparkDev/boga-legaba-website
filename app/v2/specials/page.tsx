import type { Metadata } from 'next'
import { SpecialsCheckAvailability } from '@/components/specials-check-availability'
import { PageHeader } from '@v2/components/page-header'
import { Reveal } from '@v2/components/reveal'

export const metadata: Metadata = {
  title: 'Specials & Offers',
  description:
    'Current specials and seasonal offers at Boga Legaba Guest House Mahikeng: direct booking benefits and corporate packages.',
}

const specials = [
  {
    title: 'Direct Booking Advantage',
    detail:
      'Book on our site or via NightsBridge and skip OTA fees, with best available rates and instant confirmation.',
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
            <SpecialsCheckAvailability />
          </Reveal>
        </div>
      </section>
    </main>
  )
}
