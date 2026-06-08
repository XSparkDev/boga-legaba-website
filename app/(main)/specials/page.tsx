import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { SiteImage } from "@/components/site-image"
import { InterestForm } from "@/components/forms/interest-form"
import { Reveal } from "@/components/reveal"
import { getSiteImage } from "@/lib/site-images"

export const metadata: Metadata = {
  title: "Specials & Offers | Boga Legaba Guest House, Mahikeng",
  description:
    "Current offers and promotions at Boga Legaba in Mahikeng — extended stay discounts, conference + accommodation packages and government rate specials. Book direct.",
}

const SPECIALS = [
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

export default function SpecialsPage() {
  return (
    <main>
      <PageHeader
        eyebrow="Direct Booking Offers"
        title="Current Offers & Promotions"
        subtitle="Book directly with Boga Legaba to access our best available rates and exclusive packages."
      />

      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {SPECIALS.map((s, i) => {
              const img = getSiteImage(s.imageKey)
              return (
                <Reveal as="article" key={s.name} delay={i * 90}>
                  <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
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
                        className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#0a0a0a] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2a2a2a]"
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
              <InterestForm submitLabel="Subscribe for Offers" gaEvent="specials_subscribe" />
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  )
}
