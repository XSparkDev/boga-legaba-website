import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Zap } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { SiteImage } from "@/components/site-image"
import { InterestForm } from "@/components/forms/interest-form"
import { Reveal } from "@/components/reveal"
import { getSiteImage } from "@/lib/site-images"
import { fetchSpecials } from "@/lib/nightsbridge-api"

export const metadata: Metadata = {
  title: "Specials & Offers | Boga Legaba Guest House, Mahikeng",
  description:
    "Current offers and promotions at Boga Legaba in Mahikeng — extended stay discounts, conference + accommodation packages and government rate specials. Book direct.",
}

export const dynamic = "force-dynamic"

const STATIC_SPECIALS = [
  {
    name: "Extended Stay Discount",
    imageKey: "specials.extended-stay",
    desc: "Save on stays of 7 nights or more across any property. Ideal for project teams and relocations.",
    validity: "Valid year-round",
  },
  {
    name: "Conference + Accommodation",
    imageKey: "specials.conference-accommodation",
    desc: "Bundle your Lantana conference with on-site rooms for delegates at a combined rate.",
    validity: "Valid Mon–Fri bookings",
  },
  {
    name: "Government Rate Special",
    imageKey: "specials.government-rate",
    desc: "Per diem-aligned rates for qualifying government departments and officials.",
    validity: "Subject to verification",
  },
]

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${iso}T12:00:00`),
  )
}

export default async function SpecialsPage() {
  // Fetch live specials from NightsBridge
  const liveSpecials = await fetchSpecials(21091)

  return (
    <main>
      <PageHeader
        eyebrow="Direct Booking Offers"
        title="Current Offers & Promotions"
        subtitle="Book directly with Boga Legaba to access our best available rates and exclusive packages."
      />

      {/* Live NightsBridge specials (shown only when present) */}
      {liveSpecials.length > 0 ? (
        <section className="bg-[#000000] py-12 lg:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#996948]/20">
                <Zap className="size-3.5 text-[#996948]" />
              </span>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/50">
                Live from NightsBridge · {new Date().toLocaleDateString("en-ZA")}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {liveSpecials.map((s) => (
                <div
                  key={s.specialid}
                  className="rounded-xl border border-[#996948]/20 bg-white/5 p-5 text-white backdrop-blur-sm"
                >
                  {s.imageurl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.imageurl}
                      alt={s.title}
                      className="mb-4 h-36 w-full rounded-lg object-cover"
                    />
                  ) : null}
                  <h3 className="font-serif text-xl font-bold text-white">{s.title}</h3>
                  {s.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-white/70">{s.description}</p>
                  ) : null}
                  {s.discount ? (
                    <span className="mt-3 inline-block rounded-full bg-[#996948]/20 px-3 py-1 font-mono text-[11px] text-[#996948]">
                      {s.discount}
                      {s.discounttype === "percent" ? "%" : ""} off
                    </span>
                  ) : null}
                  {s.validfrom && s.validto ? (
                    <p className="mt-3 font-mono text-[10px] text-white/40">
                      Valid {fmtDate(s.validfrom)} — {fmtDate(s.validto)}
                    </p>
                  ) : null}
                  <Link
                    href={`/book-now?bbid=21091`}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#996948] px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-white transition hover:brightness-110"
                  >
                    Book Now <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {STATIC_SPECIALS.map((s, i) => {
              const img = getSiteImage(s.imageKey)
              return (
                <Reveal as="article" key={s.name} delay={i * 90}>
                  <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-[#996948]/40">
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <SiteImage
                        src={img.url}
                        alt={`${s.name} at Boga Legaba — ${img.alt}`}
                        fill
                        sizes="(max-width: 1024px) 100vw, 33vw"
                        className="transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="font-serif text-2xl text-foreground">{s.name}</h3>
                      <p className="mt-3 flex-1 text-pretty text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                      <span className="mt-4 font-mono text-[10px] uppercase tracking-wider text-taupe">{s.validity}</span>
                      <Link
                        href="/book-now"
                        data-ga4-event="specials_click"
                        className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#000000] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2a2a2a]"
                      >
                        Book This Special <ArrowRight className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-warm-white py-16 lg:py-24">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <h2 className="text-balance font-serif text-3xl font-bold text-foreground sm:text-4xl">
              Specials update regularly
            </h2>
            <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
              Subscribe to be the first to hear about new offers and seasonal promotions.
            </p>
            <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
              <InterestForm submitLabel="Subscribe for Offers" gaEvent="specials_subscribe" source="Specials" />
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  )
}
