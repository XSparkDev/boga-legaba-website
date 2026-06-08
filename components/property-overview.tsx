import Link from "next/link"
import { properties } from "@/data/rooms"
import { Reveal } from "@/components/reveal"
import { SiteImage } from "@/components/site-image"
import { getSiteImage } from "@/lib/site-images"

const PROPERTY_IMAGE_KEYS: Record<string, string> = {
  chababa: "property.chababa",
  "interlaken-a": "property.interlaken-a",
  lantana: "property.lantana",
}

export function PropertyOverview() {
  const featured = properties.filter((p) => p.id !== "transnet")

  return (
    <section className="section-padding bg-warm-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <span className="section-label">Our Properties</span>
          <h2 className="heading-display text-balance font-bold">
            Three Properties, One Portfolio
          </h2>
          <p className="mt-5 text-pretty text-base leading-[1.7] text-body-text font-body">
            Each property is physically located at a different address with its own character. Choose the one that fits
            your stay — and always confirm your arrival address at booking.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {featured.map((p, i) => {
            const img = getSiteImage(PROPERTY_IMAGE_KEYS[p.id] ?? "hero")
            return (
              <Reveal as="article" key={p.id} delay={i * 100}>
                <Link
                  href="/stay"
                  className="card-lift rounded-2xl overflow-hidden bg-white group cursor-pointer flex h-full flex-col"
                  style={{ borderTop: `4px solid ${p.colorHex}` }}
                >
                  <div className="relative overflow-hidden h-[280px]">
                    <SiteImage
                      src={img.url}
                      alt={`${p.name} guest house exterior — ${img.alt}`}
                      fill
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      className="transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />
                    <div className="absolute top-4 right-4 bg-white/15 backdrop-blur-sm text-white font-mono text-[10px] tracking-widest px-3 py-1.5 rounded-full border border-white/20 z-[1]">
                      {p.roomCount} ROOMS
                    </div>
                    <div
                      className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full border z-[1]"
                      style={{ borderColor: `${p.colorHex}66` }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.colorHex }} />
                      <span
                        className="font-mono text-[10px] tracking-[0.15em] uppercase"
                        style={{ color: p.colorHex }}
                      >
                        {p.name}
                      </span>
                    </div>
                  </div>

                  <div className="p-7 flex flex-col flex-1">
                    <p className="font-mono text-[10px] tracking-[0.18em] text-gold uppercase mb-2">
                      {p.tagline}
                    </p>
                    <h3 className="font-display text-[28px] leading-tight text-[#0A0A0A] mb-1">{p.code}</h3>
                    <p className="font-mono text-[11px] text-taupe tracking-wide mb-3">{p.address}</p>
                    <p className="font-body text-sm text-body-text leading-relaxed mb-5 line-clamp-3 flex-1">
                      {p.description}
                    </p>
                    <span className="inline-flex items-center gap-2 font-body text-sm font-medium text-gold group/link">
                      View Rooms
                      <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                    </span>
                  </div>
                </Link>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
