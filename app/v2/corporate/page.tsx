import type { Metadata } from 'next'
import { Check } from 'lucide-react'
import { PageHeader } from '@v2/components/page-header'
import { Reveal } from '@v2/components/reveal'
import { CorporateForm } from '@v2/components/forms/corporate-form'

export const metadata: Metadata = {
  title: 'Corporate & Government Accommodation in Mahikeng',
  description:
    'Government accommodation in Mahikeng with VAT invoices, purchase order support, per diem rates and block bookings. Structured booking for corporate and government teams.',
}

const trust = [
  'VAT-compliant tax invoices (Xero-integrated)',
  'Purchase order support',
  'Government per diem rates honoured',
  'Multi-room block bookings',
  'Dedicated account management',
  'Credit account facility (qualifying accounts)',
]

export default function CorporatePage() {
  return (
    <main>
      <PageHeader
        label="Corporate & Government"
        title="We speak procurement."
        subtitle="Structured booking processes for corporate teams and government departments."
      />

      <section className="bg-cream py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 md:px-8 lg:grid-cols-2">
          {/* Left trust */}
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-terracotta">
              Built for Procurement
            </p>
            <h2 className="mt-3 font-display text-4xl font-light leading-tight text-deep-earth md:text-5xl">
              Booking the way your finance team needs it.
            </h2>
            <ul className="mt-8 space-y-4">
              {trust.map((t) => (
                <li key={t} className="flex items-start gap-3 text-body-brown">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-terracotta" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* Right form */}
          <Reveal delay={120}>
            <div id="corporate-enquiry" className="scroll-mt-24 rounded-2xl bg-off-white p-6 shadow-[0_4px_24px_rgba(44,26,14,0.08)] md:p-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-terracotta">
                Corporate Enquiry
              </p>
              <h3 className="mt-3 mb-7 font-display text-3xl italic text-deep-earth">
                Request a corporate booking
              </h3>
              <CorporateForm />
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  )
}
