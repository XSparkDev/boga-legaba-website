import { Reveal } from '@v2/components/reveal'
import { propertyByKey } from '@v2/data/site'
import { PropertyCard } from './property-card'

export function PropertiesSection() {
  return (
    <section id="properties" className="grain-surface scroll-mt-24 bg-cream py-20 md:py-28">
      <div className="relative z-[2] mx-auto max-w-7xl px-6 md:px-8">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-terracotta">
            Our Properties
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 max-w-2xl font-display text-4xl font-light leading-tight text-deep-earth text-balance md:text-5xl">
            Three properties, one seamless portfolio.
          </h2>
        </Reveal>

        <div className="mt-12 grid auto-rows-[200px] grid-cols-1 gap-5 md:grid-cols-2">
          <Reveal delay={0} className="md:row-span-2">
            <PropertyCard property={propertyByKey('chababa')} tall />
          </Reveal>
          <Reveal delay={100}>
            <PropertyCard property={propertyByKey('interlaken-a')} />
          </Reveal>
          <Reveal delay={200}>
            <PropertyCard property={propertyByKey('lantana')} />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
