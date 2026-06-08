import type { Metadata } from "next"
import { Phone, Mail, Globe, MessageCircle, MapPin } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { ContactForm } from "@/components/forms/contact-form"
import { LocationSection } from "@/components/contact/location-section"
import { Reveal } from "@/components/reveal"
import { properties, BUSINESS } from "@/data/rooms"

export const metadata: Metadata = {
  title: "Contact Us | Boga Legaba Guest House & Conference Centre",
  description:
    "Get in touch with Boga Legaba in Mahikeng. Call, email, or WhatsApp our team for bookings, conferences, and corporate enquiries.",
}

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Get In Touch"
        title="We're here to help"
        subtitle="Reach out for bookings, conference enquiries, or corporate arrangements. Our team responds quickly across phone, email, and WhatsApp."
      />

      <section className="bg-[#FAFAF8] py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:px-8">
          {/* Left: contact details */}
          <Reveal className="flex flex-col gap-8">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold">Direct Lines</p>
              <h2 className="mt-3 font-serif text-3xl leading-tight text-foreground">Talk to our team</h2>
            </div>

            <ul className="flex flex-col gap-4">
              <li>
                <a
                  href={BUSINESS.phoneHref}
                  className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <span className="inline-flex size-11 items-center justify-center rounded-full bg-[#0a0a0a] text-gold">
                    <Phone className="size-5" />
                  </span>
                  <span className="flex flex-col">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Phone</span>
                    <span className="font-medium text-foreground">{BUSINESS.phone}</span>
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${BUSINESS.email}`}
                  className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <span className="inline-flex size-11 items-center justify-center rounded-full bg-[#0a0a0a] text-gold">
                    <Mail className="size-5" />
                  </span>
                  <span className="flex flex-col">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Email</span>
                    <span className="font-medium text-foreground">{BUSINESS.email}</span>
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={BUSINESS.whatsappGeneral}
                  target="_blank"
                  rel="noreferrer"
                  data-ga4-event="whatsapp_click"
                  data-ga4-label="Contact Page"
                  className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <span className="inline-flex size-11 items-center justify-center rounded-full bg-[#25D366] text-white">
                    <MessageCircle className="size-5" />
                  </span>
                  <span className="flex flex-col">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">WhatsApp</span>
                    <span className="font-medium text-foreground">Message us directly</span>
                  </span>
                </a>
              </li>
              <li>
                <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
                  <span className="inline-flex size-11 items-center justify-center rounded-full bg-[#0a0a0a] text-gold">
                    <Globe className="size-5" />
                  </span>
                  <span className="flex flex-col">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Website</span>
                    <span className="font-medium text-foreground">{BUSINESS.website}</span>
                  </span>
                </div>
              </li>
            </ul>

            {/* Property addresses */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold">Our Addresses</p>
              <ul className="mt-4 flex flex-col gap-4">
                {properties
                  .filter((p) => p.id !== "transnet")
                  .map((p) => (
                    <li key={p.id} className="flex items-start gap-3 border-l-2 pl-3" style={{ borderColor: p.colorHex }}>
                      <MapPin className="mt-0.5 size-4 shrink-0" style={{ color: p.colorHex }} />
                      <span className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {p.name} <span className="text-muted-foreground">· {p.code}</span>
                        </span>
                        <span className="text-sm text-muted-foreground">{p.address}</span>
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </Reveal>

          {/* Right: form */}
          <Reveal delay={120}>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-gold">Send a Message</p>
            <h2 className="mb-6 font-serif text-3xl leading-tight text-foreground">Drop us a line</h2>
            <ContactForm />
          </Reveal>
        </div>
      </section>

      <LocationSection />
    </>
  )
}
