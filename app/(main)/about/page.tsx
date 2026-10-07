import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Reveal } from "@/components/reveal"
import { FEATURES } from "@/components/home/why-section"
import { properties } from "@/data/rooms"

export const metadata: Metadata = {
  title: "About | Boga Legaba Guest House & Conference Centre, Mahikeng",
  description:
    "About Boga Legaba - established accommodation and conference hospitality in Mahikeng. Three properties, 27 rooms, direct bookings and corporate-ready service.",
}

/**
 * About page. Content is assembled from copy already published elsewhere on
 * the site (homepage "why" section, property overview, footer) - no new
 * claims are introduced here.
 */
export default function AboutPage() {
  const featured = properties.filter((p) => p.id !== "transnet")

  return (
    <main>
      <PageHeader
        eyebrow="About"
        title="About Boga Legaba"
        subtitle="Established accommodation and conference hospitality in Mahikeng. Three unique properties, 27 rooms, one seamless experience."
        bgImage="/Organized/Property%202/lantana%20exterior/IMG_2656-HDR.jpg"
      />

      {/* Who we are */}
      <section className="section-padding bg-warm-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <span className="section-label">Who we are</span>
              <h2 className="heading-display text-balance font-bold">
                Three Properties, One Portfolio
              </h2>
              <p className="mt-5 text-pretty text-base leading-[1.7] text-body-text font-body">
                Boga Legaba Guest House &amp; Conference Centre offers established accommodation and
                conference hospitality in Mahikeng, North West Province - 27 rooms across 3 distinct
                properties, and a conference venue with capacity for 80+ delegates.
              </p>
              <p className="mt-4 text-pretty text-base leading-[1.7] text-body-text font-body">
                Each property is physically located at a different address with its own character.
                Choose the one that fits your stay, and always confirm your arrival address at
                booking.
              </p>
              <p className="mt-4 text-pretty text-base leading-[1.7] text-body-text font-body">
                Book direct for the best available rate - reservations are confirmed instantly
                through our NightsBridge engine, with WhatsApp and phone support from our team if
                you need a hand.
              </p>
            </Reveal>

            <Reveal delay={100}>
              <ul className="grid gap-4 sm:grid-cols-2">
                {FEATURES.map((f) => (
                  <li
                    key={f.title}
                    className="rounded-xl border border-border bg-card p-5"
                  >
                    <span aria-hidden className="text-xl text-gold">{f.icon}</span>
                    <h3 className="mt-2 font-heading text-base font-bold text-foreground">
                      {f.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-body-text">{f.desc}</p>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Properties */}
      <section className="section-padding bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-2xl">
            <span className="section-label">Where you&apos;ll stay</span>
            <h2 className="heading-display text-balance font-bold">Our properties</h2>
            <p className="mt-5 text-pretty text-base leading-[1.7] text-body-text font-body">
              Three guest properties in Riviera Park, Mahikeng - plus our managed Transnet portfolio
              for overflow and block bookings.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {featured.map((p, i) => (
              <Reveal as="article" key={p.id} delay={i * 90}>
                <Link
                  href={`/stay#property-${p.id}`}
                  className="card-lift flex h-full flex-col rounded-2xl bg-warm-white p-7"
                  style={{ borderTop: `4px solid ${p.colorHex}` }}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                    {p.tagline}
                  </p>
                  <h3 className="mt-2 font-display text-2xl text-foreground">{p.name}</h3>
                  <p className="mt-1 font-mono text-[11px] text-taupe">{p.address}</p>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-body-text">
                    {p.description}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 font-body text-sm font-medium text-gold">
                    View rooms
                    <ArrowRight className="size-4" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#000000] py-14 text-white">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-balance font-serif text-2xl font-bold sm:text-3xl">
            Established accommodation and conference hospitality in Mahikeng
          </h2>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/stay"
              className="inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-[#000000] transition-colors hover:bg-[#b8943c]"
            >
              Book Now <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:border-white/60"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
