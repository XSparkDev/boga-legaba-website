import type { Metadata } from 'next'
import { v2Path } from '@v2/lib/paths'
import Link from 'next/link'
import { Mail, MapPin, Phone } from 'lucide-react'
import { LocationSection } from '@v2/components/contact/location-section'
import { PageHeader } from '@v2/components/page-header'
import { Reveal } from '@v2/components/reveal'
import { WhatsAppIcon } from '@v2/components/whatsapp-icon'
import { EMAIL, PHONE, properties, waLink } from '@v2/data/site'

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Contact Boga Legaba Guest House Mahikeng — phone, email and WhatsApp for Chababa, Interlaken A and Lantana.',
}

export default function ContactPage() {
  return (
    <main>
      <PageHeader
        label="Get in Touch"
        title="We’re here to help."
        subtitle="Reception, conference bookings and accounts — reach the right team across our three properties."
      />

      <section className="bg-cream py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 md:px-8">
          <div className="grid gap-10 lg:grid-cols-2">
            <Reveal>
              <div className="rounded-2xl bg-off-white p-8 shadow-[0_4px_24px_rgba(44,26,14,0.08)]">
                <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-terracotta">
                  General Enquiries
                </p>
                <ul className="mt-6 space-y-5">
                  <li>
                    <a
                      href={`tel:${PHONE.replace(/\s/g, '')}`}
                      className="flex items-center gap-3 text-body-brown transition-colors hover:text-terracotta"
                    >
                      <Phone className="h-5 w-5 shrink-0 text-terracotta" />
                      <span className="font-sans text-lg">{PHONE}</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href={`mailto:${EMAIL}`}
                      className="flex items-center gap-3 text-body-brown transition-colors hover:text-terracotta"
                    >
                      <Mail className="h-5 w-5 shrink-0 text-terracotta" />
                      <span className="font-sans text-lg">{EMAIL}</span>
                    </a>
                  </li>
                </ul>
                <p className="mt-8 text-sm leading-relaxed text-muted-brown">
                  Reception 24/7 · Conference Mon–Fri 8–5 · Accounts Mon–Fri 8–4
                </p>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="space-y-4">
                {properties.map((p) => (
                  <div
                    key={p.key}
                    className="rounded-2xl bg-off-white p-6 shadow-[0_4px_24px_rgba(44,26,14,0.08)]"
                  >
                    <h2 className="font-display text-2xl italic text-deep-earth">{p.name}</h2>
                    <p className="mt-1 flex items-start gap-2 text-sm text-muted-brown">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" />
                      {p.address}, {p.area}
                    </p>
                    <a
                      href={waLink(p.key, `Hello, I'd like to enquire about ${p.name}.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 font-sans text-sm font-medium text-terracotta hover:text-terracotta-light"
                    >
                      <WhatsAppIcon className="h-4 w-4" />
                      WhatsApp {p.name}
                    </a>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={160} className="mt-12 text-center">
            <Link
              href={v2Path("/book-now")}
              className="inline-flex rounded-full bg-terracotta px-8 py-3.5 font-sans text-sm font-medium text-white transition-colors hover:bg-terracotta-light"
            >
              Book Your Stay
            </Link>
          </Reveal>
        </div>
      </section>

      <LocationSection />
    </main>
  )
}
