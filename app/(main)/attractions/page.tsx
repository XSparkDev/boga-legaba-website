import type { Metadata } from "next"
import Link from "next/link"
import { Trees, Landmark, ShoppingBag, UtensilsCrossed, BookMarked, Plane, ArrowRight } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { SiteImage } from "@/components/site-image"
import { Reveal } from "@/components/reveal"
import { getSiteImage } from "@/lib/site-images"

export const metadata: Metadata = {
  title: "Mahikeng Attractions | Local Guide | Boga Legaba",
  description:
    "Your local guide to Mahikeng (Mafikeng), North West Province. Game reserve, government buildings, shopping, restaurants, historical sites and airport — all near Boga Legaba.",
}

const ATTRACTIONS = [
  { Icon: Trees, name: "Mahikeng Game Reserve", distance: "~6 km", note: "Big game and birdlife minutes from the city centre." },
  { Icon: Landmark, name: "Government Buildings", distance: "~3 km", note: "Provincial legislature and departmental offices." },
  { Icon: ShoppingBag, name: "Shopping", distance: "~2 km", note: "Mega City and Mafikeng Mall for retail and essentials." },
  { Icon: UtensilsCrossed, name: "Restaurants", distance: "~2 km", note: "A range of local and franchise dining options." },
  { Icon: BookMarked, name: "Historical Sites", distance: "~4 km", note: "Mafikeng Museum and Anglo-Boer War heritage." },
  { Icon: Plane, name: "Mahikeng Airport", distance: "~18 km", note: "Convenient regional access for business travel." },
]

export default function AttractionsPage() {
  return (
    <main>
      <PageHeader
        eyebrow="Local Guide"
        title="Exploring Mahikeng — Your Local Guide"
        subtitle="Make the most of your stay in Mahikeng, North West Province. Here's what's close to Boga Legaba."
      />

      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ATTRACTIONS.map(({ Icon, name, distance, note }, i) => (
              <Reveal as="article" key={name} delay={i * 70}>
                <div className="flex h-full flex-col rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex size-11 items-center justify-center rounded-full bg-[#0a0a0a] text-gold">
                      <Icon className="size-5" />
                    </span>
                    <span className="font-mono text-xs uppercase tracking-wider text-taupe">{distance}</span>
                  </div>
                  <h3 className="mt-5 font-serif text-xl text-foreground">{name}</h3>
                  <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">{note}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12">
            <div className="relative aspect-[21/9] w-full overflow-hidden rounded-2xl">
              <SiteImage
                src={getSiteImage("attractions.map").url}
                alt={`Mahikeng and North West Province landscape near Boga Legaba — ${getSiteImage("attractions.map").alt}`}
                fill
                sizes="(max-width: 1280px) 100vw, 1280px"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-[#0a0a0a] py-14 text-white">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-balance font-serif text-2xl font-bold sm:text-3xl">
            Book your stay in Mahikeng&apos;s most central guest house
          </h2>
          <Link
            href="/book-now"
            data-ga4-event="book_now_click"
            className="inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-[#b8943c]"
          >
            Book Now <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </main>
  )
}
