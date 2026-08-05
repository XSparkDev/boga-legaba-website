import type { Metadata } from "next"
import { Trees, Landmark, ShoppingBag, UtensilsCrossed, BookMarked, Plane, MapPin, Star, Navigation2 } from "lucide-react"
import { AttractionsBookingCta } from "@/components/attractions-booking-cta"
import { PageHeader } from "@/components/page-header"
import { SiteImage } from "@/components/site-image"
import { Reveal } from "@/components/reveal"
import { resolveSiteImage } from "@/lib/site-images-live"
import { fetchEstablishment } from "@/lib/nightsbridge-api"

export const metadata: Metadata = {
  title: "Mahikeng Attractions | Local Guide | Boga Legaba",
  description:
    "Your local guide to Mahikeng, North West Province. Game reserve, government buildings, shopping, restaurants, historical sites and airport, all near Boga Legaba.",
}

export const dynamic = "force-dynamic"

const ATTRACTIONS = [
  { Icon: Trees, name: "Mahikeng Game Reserve", distance: "~6 km", note: "Big game and birdlife minutes from the city centre." },
  { Icon: Landmark, name: "Government Buildings", distance: "~3 km", note: "Provincial legislature and departmental offices." },
  { Icon: ShoppingBag, name: "Shopping", distance: "~2 km", note: "Mega City and Mahikeng Mall for retail and essentials." },
  { Icon: UtensilsCrossed, name: "Restaurants", distance: "~2 km", note: "A range of local and franchise dining options." },
  { Icon: BookMarked, name: "Historical Sites", distance: "~4 km", note: "Mahikeng Museum and Anglo-Boer War heritage." },
  { Icon: Plane, name: "Mahikeng Airport", distance: "~18 km", note: "Convenient regional access for business travel." },
]

export default async function AttractionsPage() {
  // Fetch live area data from NightsBridge
  const estData = await fetchEstablishment(21091)
  const mapImage = await resolveSiteImage("attractions.map")

  // Parse attractions list from NB (newline + "*" delimited)
  const nbAttractions = estData?.attractions
    ? estData.attractions
        .split(/\n/)
        .map((l) => l.replace(/^\*\s*/, "").trim())
        .filter(Boolean)
    : []

  return (
    <main>
      <PageHeader
        eyebrow="Local Guide"
        title="Exploring Mahikeng: Your Local Guide"
        subtitle="Make the most of your stay in Mahikeng, North West Province. Here's what's close to Boga Legaba."
        bgImage="/Organized/Property%201/Interlaken/IMG_2485-HDR.jpg"
      />

      {/* Live from NightsBridge: area info + attractions */}
      {(estData?.areainfo || nbAttractions.length > 0) ? (
        <section className="bg-[#f5f0e8] py-12 lg:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-center gap-2">
              <MapPin className="size-4 text-[#996948]" />
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#996948]">
                Live · Sourced from NightsBridge
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {estData?.areainfo ? (
                <div className="rounded-xl border border-[#996948]/20 bg-white p-6 shadow-sm">
                  <h2 className="mb-3 flex items-center gap-2 font-serif text-xl font-bold text-gray-900">
                    <span className="text-[#996948]">About Mahikeng</span>
                  </h2>
                  <p className="text-sm leading-relaxed text-gray-600">{estData.areainfo}</p>

                  {estData.lat && estData.lng ? (
                    <a
                      href={`https://www.google.com/maps?q=${estData.lat},${estData.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#996948]/30 px-4 py-2 font-mono text-[11px] text-[#996948] hover:bg-[#996948]/5 transition-colors"
                    >
                      <Navigation2 className="size-3.5" />
                      View on Google Maps
                    </a>
                  ) : null}
                </div>
              ) : null}

              {nbAttractions.length > 0 ? (
                <div className="rounded-xl border border-[#996948]/20 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 flex items-center gap-2 font-serif text-xl font-bold text-gray-900">
                    <Star className="size-5 text-[#996948]" />
                    What to see and do
                  </h2>
                  <ul className="space-y-2">
                    {nbAttractions.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="mt-0.5 shrink-0 text-[#996948] font-bold">✦</span>
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {/* Directions */}
            {estData?.directions ? (
              <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-gray-500">
                  🗺️ Getting to Boga Legaba
                </h3>
                {estData.address ? (
                  <p className="mb-2 font-mono text-[11px] text-[#996948]">
                    {estData.address.replace(/\n/g, " · ")}
                  </p>
                ) : null}
                <p className="text-sm leading-relaxed text-gray-600">{estData.directions}</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ATTRACTIONS.map(({ Icon, name, distance, note }, i) => (
              <Reveal as="article" key={name} delay={i * 70}>
                <div className="flex h-full flex-col rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#996948]/40">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex size-11 items-center justify-center rounded-full bg-[#000000] text-gold">
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
                src={mapImage.url}
                alt={`Mahikeng and North West Province landscape near Boga Legaba: ${mapImage.alt}`}
                fill
                sizes="(max-width: 1280px) 100vw, 1280px"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-[#000000] py-14 text-white">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-balance font-serif text-2xl font-bold sm:text-3xl">
            Book your stay in Mahikeng&apos;s most central guest house
          </h2>
          <AttractionsBookingCta />
        </div>
      </section>
    </main>
  )
}
