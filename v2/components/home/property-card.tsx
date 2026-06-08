import Link from 'next/link'
import { v2Path } from '@v2/lib/paths'
import { ArrowUpRight } from 'lucide-react'
import { SiteImage } from '@v2/components/site-image'
import { getSiteImage } from '@v2/data/images'
import type { Property } from '@v2/data/site'
import { cn } from '@v2/lib/utils'

const propertyImageKey = {
  chababa: 'property-chababa',
  'interlaken-a': 'property-interlaken-a',
  lantana: 'property-lantana',
} as const

export function PropertyCard({
  property,
  tall,
}: {
  property: Property
  tall?: boolean
}) {
  const imageKey = propertyImageKey[property.key as keyof typeof propertyImageKey]
  const image = imageKey ? getSiteImage(imageKey) : getSiteImage('property-chababa')

  return (
    <Link
      href={v2Path("/stay")}
      data-ga4-event="room_view"
      data-ga4-property={property.key}
      data-cursor="property"
      className={cn(
        'card-property group relative block overflow-hidden rounded-2xl will-change-transform',
        tall ? 'min-h-[420px] lg:min-h-full' : 'min-h-[200px]'
      )}
    >
      <SiteImage
        src={image.src}
        alt={image.alt}
        className="card-property-image absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-[1.02]"
      />
      <div className="pattern-stripe absolute bottom-[88px] left-0 right-0 opacity-60" />

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-deep-earth/95 via-deep-earth/50 to-transparent p-6">
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em]">
          <span className="h-2 w-2 rounded-full" style={{ background: property.color }} />
          <span style={{ color: property.color }}>{property.name}</span>
        </p>
        <h3 className="mt-2 font-display text-2xl italic text-white">{property.code}</h3>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-cream/70">{property.rooms} rooms</span>
          <span className="inline-flex items-center gap-1 text-sm text-white transition-colors group-hover:text-terracotta-light">
            View Rooms <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  )
}
