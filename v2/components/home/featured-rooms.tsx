import Link from 'next/link'
import { v2Path } from '@v2/lib/paths'
import { ArrowRight } from 'lucide-react'
import { Reveal } from '@v2/components/reveal'
import { SiteImage } from '@v2/components/site-image'
import { getSiteImage, type SiteImageData } from '@v2/data/images'
import { propertyByKey } from '@v2/data/site'

const featured = [
  { name: 'Letimela', property: 'chababa', price: 'R 950 / night', config: 'Family · Bath & Shower' },
  { name: 'Calabash', property: 'interlaken-a', price: 'R 820 / night', config: 'Double · Bath & Shower' },
  { name: 'Blue Clouds', property: 'chababa', price: 'R 780 / night', config: 'Twin · Bath & Shower' },
] as const

const featuredImageByName: Record<(typeof featured)[number]['name'], SiteImageData> = {
  Letimela: getSiteImage('room-letimela'),
  Calabash: getSiteImage('room-calabash'),
  'Blue Clouds': getSiteImage('room-blue-clouds'),
}

export function FeaturedRooms() {
  return (
    <section id="featured-rooms" className="grain-surface bg-off-white py-20 md:py-28">
      <div className="relative z-[2] mx-auto max-w-7xl px-6 md:px-8">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-terracotta">
            Featured Rooms
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 font-display text-4xl font-light text-deep-earth md:text-5xl">
            Rooms that feel like home.
          </h2>
        </Reveal>

        <div className="no-scrollbar mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
          {featured.map((room, i) => {
            const prop = propertyByKey(room.property)
            const image = featuredImageByName[room.name]
            return (
              <Reveal
                key={room.name}
                delay={i * 100}
                className="w-[300px] shrink-0 snap-start md:w-auto"
              >
                <div
                  data-cursor="room"
                  className="card-room group overflow-hidden rounded-2xl bg-cream shadow-[0_4px_24px_rgba(26,14,5,0.08)]"
                >
                  <SiteImage
                    src={image.src}
                    alt={image.alt}
                    priority={i === 0}
                    className="h-[200px] w-full"
                  >
                    <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105" />
                  </SiteImage>
                  <div className="pattern-stripe opacity-40" />
                  <div className="p-5">
                    <span
                      className="font-mono text-[10px] uppercase tracking-[0.15em]"
                      style={{ color: prop.color }}
                    >
                      ● {prop.name}
                    </span>
                    <h3 className="mt-2 font-display text-2xl italic text-deep-earth">
                      {room.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-brown">{room.config}</p>
                    <p className="card-room-price mt-3 font-mono text-xs uppercase tracking-widest text-terracotta">
                      From {room.price}
                    </p>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>

        <Reveal delay={120}>
          <div className="mt-10">
            <Link
              href={v2Path("/stay")}
              className="group inline-flex items-center gap-2 font-sans font-medium text-terracotta hover:text-terracotta-light"
            >
              Browse All 27 Rooms
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
