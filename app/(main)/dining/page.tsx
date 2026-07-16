import type { Metadata } from "next"
import { UtensilsCrossed, Wine, TreePalm, PartyPopper } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { SiteImage } from "@/components/site-image"
import { resolveSiteImage } from "@/lib/site-images-live"
import { InterestForm } from "@/components/forms/interest-form"
import { Reveal } from "@/components/reveal"

export const metadata: Metadata = {
  title: "Dining & Events at Lantana | Boga Legaba Mahikeng",
  description:
    "Coming soon: restaurant, bar, and private event bookings at our 10 Lantana property in Mahikeng. Register your interest for launch announcements.",
}

const SECTIONS = [
  { Icon: UtensilsCrossed, title: "Dining", body: "A relaxed restaurant serving local and contemporary dishes, open to guests and visitors." },
  { Icon: PartyPopper, title: "Private Events", body: "Intimate celebrations, corporate functions and milestone occasions hosted at Lantana." },
  { Icon: TreePalm, title: "Outdoor Venue", body: "A landscaped outdoor space for daytime gatherings and golden-hour receptions." },
  { Icon: Wine, title: "Bar", body: "A welcoming bar for after-work drinks, nightcaps and social evenings." },
]

export default async function DiningPage() {
  const diningImage = await resolveSiteImage("dining")
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
          <Reveal>
            <div className="relative aspect-[21/9] w-full overflow-hidden rounded-2xl">
              <SiteImage
                src={diningImage.url}
                alt={`Lantana dining and events space at Boga Legaba: ${diningImage.alt}`}
                fill
                sizes="(max-width: 1280px) 100vw, 1280px"
              />
            </div>
          </Reveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SECTIONS.map(({ Icon, title, body }, i) => (
              <Reveal as="article" key={title} delay={i * 80}>
                <div className="flex h-full flex-col rounded-xl border border-border bg-card p-6">
                  <span className="inline-flex size-12 items-center justify-center rounded-full bg-[#000000] text-gold">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-5 font-serif text-xl text-foreground">{title}</h3>
                  <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">{body}</p>
                  <span className="mt-4 font-mono text-[10px] uppercase tracking-wider text-taupe">Coming soon</span>
                </div>
              </Reveal>
            ))}
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
                interestOptions={["Dining", "Private Events", "Outdoor Venue", "Bar"]}
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
