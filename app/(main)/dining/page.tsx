import type { Metadata } from "next"
import { PageHeader } from "@/components/page-header"
import { InterestForm } from "@/components/forms/interest-form"
import { Reveal } from "@/components/reveal"
import { diningIconFor, getDiningSections } from "@/lib/dining-sections"

export const metadata: Metadata = {
  title: "Dining & Events at Lantana | Boga Legaba Mahikeng",
  description:
    "Coming soon: restaurant, bar, and private event bookings at our 10 Lantana property in Mahikeng. Register your interest for launch announcements.",
}

// Admin-managed content (via /admin/dining, table `dining_sections`) with
// built-in fallback - always renders, even before migration 019 is applied.
export const dynamic = "force-dynamic"

export default async function DiningPage() {
  const sections = await getDiningSections()
  const anyComingSoon = sections.some((s) => s.status === "coming-soon")

  return (
    <main>
      <PageHeader
        eyebrow="Dining & Events · Lantana"
        title="More Than a Room: Experiences at Lantana"
        subtitle="Coming soon: restaurant, bar, and private event bookings at our 10 Lantana property."
        bgImage="/Organized/Property%201/Interlaken/IMG_2620-HDR.jpg"
      />

      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {anyComingSoon ? (
            <Reveal>
              <p
                role="status"
                className="mx-auto mb-10 max-w-3xl rounded-2xl border border-gold/40 bg-gold/10 px-6 py-4 text-center text-sm leading-relaxed text-foreground"
              >
                <span className="font-heading font-bold">Coming soon - not open yet.</span>{" "}
                The restaurant, bar and event spaces at Lantana are still in development.
                Register your interest below and we will announce the launch.
              </p>
            </Reveal>
          ) : null}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {sections.map(({ id, title, body, icon, status }, i) => {
              const Icon = diningIconFor(icon)
              return (
                <Reveal as="article" key={id} delay={i * 80}>
                  <div className="flex h-full flex-col rounded-xl border border-border bg-card p-6">
                    <span className="inline-flex size-12 items-center justify-center rounded-full bg-[#000000] text-gold">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <h3 className="mt-5 font-serif text-xl text-foreground">{title}</h3>
                    <p className="mt-2 flex-1 text-pretty text-sm leading-relaxed text-muted-foreground">
                      {body}
                    </p>
                    {status === "coming-soon" ? (
                      <span className="mt-4 inline-flex w-fit items-center rounded-full border border-gold/50 bg-gold/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-gold">
                        Coming soon
                      </span>
                    ) : null}
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
              Register Your Interest
            </h2>
            <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
              This page is in development. Join our mailing list for launch announcements.
            </p>
            <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
              <InterestForm
                withInterestArea
                interestOptions={sections.map((s) => s.title)}
                gaEvent="dining_interest_submit"
                source="Dining"
              />
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  )
}
