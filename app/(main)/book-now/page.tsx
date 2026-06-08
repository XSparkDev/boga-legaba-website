import type { Metadata } from "next"
import { MessageCircle, Phone, ShieldCheck, Wallet, Clock } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { NightsBridgeEmbed } from "@/components/nightsbridge-embed"
import { Reveal } from "@/components/reveal"
import { properties, BUSINESS } from "@/data/rooms"

export const metadata: Metadata = {
  title: "Book Now | Boga Legaba Guest House & Conference Centre",
  description:
    "Book your stay at Boga Legaba directly through our NightsBridge booking engine, or enquire via WhatsApp for assistance. Best rates guaranteed.",
}

const PERKS = [
  { Icon: Wallet, title: "No OTA Fees", body: "Direct bookings skip agent commissions — you get the best available rate." },
  { Icon: ShieldCheck, title: "Secure & Instant", body: "Confirm your room in real time through the NightsBridge engine." },
  { Icon: Clock, title: "Fast Support", body: "Need help? Our team responds quickly on WhatsApp and phone." },
]

export default function BookNowPage() {
  const desks = properties.filter((p) => p.id !== "transnet")

  return (
    <>
      <PageHeader
        eyebrow="Reserve Your Room"
        title="Book your stay"
        subtitle="Secure your room instantly through our direct booking engine — or message a property desk on WhatsApp if you'd prefer a hand."
      />

      {/* Perks */}
      <section className="bg-[#FAFAF8] py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-3">
            {PERKS.map(({ Icon, title, body }, i) => (
              <Reveal as="article" key={title} delay={i * 90}>
                <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-6">
                  <span className="inline-flex size-12 items-center justify-center rounded-full bg-[#0a0a0a] text-gold">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-5 font-serif text-xl text-foreground">{title}</h3>
                  <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* NightsBridge engine */}
      <NightsBridgeEmbed />

      {/* WhatsApp / phone fallback */}
      <section className="bg-[#F2EDE4] py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold">Prefer To Talk?</p>
            <h2 className="mt-3 text-balance font-serif text-3xl font-bold leading-tight text-foreground sm:text-4xl">
              Book or enquire by WhatsApp
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
              Message the desk for the property you&apos;d like to stay at. Always confirm your arrival address at the time
              of booking.
            </p>
          </Reveal>

          <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
            {desks.map((p, i) => (
              <Reveal key={p.id} delay={i * 90}>
                <a
                  href={p.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  data-ga4-event="whatsapp_click"
                  data-ga4-label={p.name}
                  className="group flex h-full flex-col rounded-2xl border-l-4 bg-card p-6 shadow-[0_2px_20px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_40px_rgba(0,0,0,0.12)]"
                  style={{ borderColor: p.colorHex }}
                >
                  <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: p.colorHex }}>
                    {p.tagline}
                  </span>
                  <span className="mt-1 font-serif text-2xl text-foreground">{p.name}</span>
                  <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{p.code}</span>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#1ea952]">
                    <MessageCircle className="size-4" /> Chat now
                  </span>
                </a>
              </Reveal>
            ))}
          </div>

          <div className="mx-auto mt-8 flex max-w-4xl items-center justify-center">
            <a
              href={BUSINESS.phoneHref}
              className="inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-card px-6 py-3 text-sm font-semibold text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            >
              <Phone className="size-4 text-gold" /> Call {BUSINESS.phone}
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
