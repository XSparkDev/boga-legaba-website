import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Trees, Landmark, ShoppingBag, Utensils, BookOpen, Plane, MapPin } from 'lucide-react'
import { PageHeader } from '@v2/components/page-header'
import { Reveal } from '@v2/components/reveal'

export const metadata: Metadata = {
  title: 'Explore Mahikeng: Attractions Near Your Guest House',
  description:
    'Things to do near our guest house in Mahikeng: game reserve, government buildings, shopping, restaurants, history and the airport. Plan your stay in North West Province.',
}

const attractions = [
  { icon: Trees, name: 'Game Reserve', distance: '12 km', note: 'Botsalano & nearby reserves for game drives.' },
  { icon: Landmark, name: 'Government Buildings', distance: '4 km', note: 'Provincial offices and the legislature precinct.' },
  { icon: ShoppingBag, name: 'Shopping', distance: '3 km', note: 'Mega City and Mahikeng Mall for everything you need.' },
  { icon: Utensils, name: 'Restaurants', distance: '2–5 km', note: 'Local eateries and familiar favourites.' },
  { icon: BookOpen, name: 'History', distance: '5 km', note: 'Mahikeng Museum and the Siege of Mafeking sites.' },
  { icon: Plane, name: 'Airport', distance: '18 km', note: 'Mahikeng Airport for regional connections.' },
]

export default function AttractionsPage() {
  return (
    <main>
      <PageHeader
        label="Mahikeng Attractions"
        title="Explore Mahikeng"
        subtitle="Stay central, see it all. Here’s what’s close to your Boga Legaba base in North West Province."
      />

      <section className="bg-cream py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 md:px-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {attractions.map((a, i) => (
              <Reveal key={a.name} delay={(i % 3) * 80}>
                <div className="group h-full rounded-2xl bg-off-white p-7 shadow-[0_4px_24px_rgba(44,26,14,0.08)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_40px_rgba(44,26,14,0.16)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-terracotta/10">
                    <a.icon className="h-6 w-6 text-terracotta" />
                  </div>
                  <div className="mt-5 flex items-center justify-between">
                    <h3 className="font-display text-2xl italic text-deep-earth">{a.name}</h3>
                    <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-terracotta">
                      <MapPin className="h-3 w-3" />
                      {a.distance}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-body-brown">{a.note}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12 text-center">
            <Link
              href="/book-now"
              data-ga4-event="book_now_click"
              className="group inline-flex items-center gap-2 rounded-full bg-terracotta px-7 py-4 font-sans font-medium text-white transition-colors hover:bg-terracotta-light"
            >
              Book your Mahikeng base
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>
      </section>
    </main>
  )
}
