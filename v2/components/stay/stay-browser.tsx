'use client'

import { useMemo, useState } from 'react'
import { MapPin } from 'lucide-react'
import { Reveal } from '@v2/components/reveal'
import { MultiCriteriaSearch } from '@v2/components/multi-criteria-search'
import { RoomCard } from './room-card'
import { properties } from '@v2/data/site'
import { rooms, roomsByProperty, type Room } from '@v2/data/rooms'
import { matchesAllCriteria } from '@v2/lib/match-criteria'
import { NAV_STICKY_TOP_CLASS } from '@/lib/nav-shell'
import { scrollToElement } from '@/lib/smooth-scroll'
import { cn } from '@v2/lib/utils'

const stayFilterSuggestions = [
  'Twin',
  'Double',
  'Family',
  'Triple',
  'Chababa',
  'Interlaken',
  'Lantana',
  'Bath',
  'Shower',
  'Mahikeng',
]

function roomSearchText(room: Room) {
  const propertyName = properties.find((p) => p.key === room.property)?.name ?? room.property
  return [room.name, propertyName, room.property, room.configuration, room.bathroom, room.address].join(
    ' '
  )
}

const banners: Record<string, string> = {
  chababa:
    'Chababa is at 8 Interlaken Avenue — a different building to 6 Interlaken. Always confirm your arrival address when booking.',
  'interlaken-a':
    'Interlaken A is at 6 Interlaken Avenue — not the same building as 8 Interlaken (Chababa). Confirm your arrival address.',
  lantana:
    'Lantana is at 10 Lantana Street, a separate address from the Interlaken properties.',
  transnet:
    'The Transnet Portfolio rooms are confirmed at booking — please enquire for current addresses and availability.',
}

export function StayBrowser() {
  const [active, setActive] = useState<string>(properties[0].key)
  const [criteria, setCriteria] = useState<string[]>([])

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => matchesAllCriteria(roomSearchText(room), criteria))
  }, [criteria])

  const matchCount = criteria.length > 0 ? filteredRooms.length : rooms.length

  function goTo(key: string) {
    setActive(key)
    scrollToElement(`property-${key}`)
  }

  return (
    <div className="bg-cream">
      {/* Pill carousel */}
      <div
        className={cn(
          'sticky z-50 border-b border-warm-sand/60 bg-cream supports-[backdrop-filter]:bg-cream/95 supports-[backdrop-filter]:backdrop-blur-md',
          NAV_STICKY_TOP_CLASS,
        )}
      >
        <div className="no-scrollbar mx-auto flex max-w-7xl gap-3 overflow-x-auto px-6 py-4 md:px-8">
          {properties.map((p) => {
            const isActive = active === p.key
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => goTo(p.key)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest transition-all'
                )}
                style={{
                  borderColor: p.color,
                  background: isActive ? p.color : '#ffffff',
                  color: isActive ? '#fff' : p.color,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: isActive ? '#fff' : p.color }}
                />
                {p.name} · {p.rooms} rooms
              </button>
            )
          })}
        </div>
      </div>

      <div className="border-b border-warm-sand/60 bg-cream">
        <div className="mx-auto max-w-7xl px-6 py-8 md:px-8">
          <MultiCriteriaSearch
            placeholder="Filter rooms — twin, double, Chababa, bath & shower…"
            suggestions={stayFilterSuggestions}
            criteria={criteria}
            onCriteriaChange={setCriteria}
            matchCount={matchCount}
            matchLabel={matchCount === 1 ? 'room meets your criteria' : 'rooms meet your criteria'}
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-20">
        {criteria.length > 0 && filteredRooms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-warm-sand bg-off-white px-6 py-12 text-center">
            <p className="font-display text-xl italic text-deep-earth">No rooms match these filters.</p>
            <p className="mt-2 text-sm text-muted-brown">Try removing a filter or browse all properties above.</p>
          </div>
        ) : null}

        {properties.map((p) => {
          const propRooms = roomsByProperty(p.key).filter((room) =>
            criteria.length === 0 ? true : filteredRooms.some((r) => r.name === room.name)
          )
          if (propRooms.length === 0) return null
          return (
            <section
              key={p.key}
              id={`property-${p.key}`}
              className="scroll-mt-[calc(4.5rem+5rem)] pb-16 last:pb-0 xl:scroll-mt-[calc(6rem+5rem)]"
            >
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
                <h2 className="font-display text-3xl italic text-deep-earth md:text-4xl">
                  {p.name}
                </h2>
                <span className="font-mono text-[11px] uppercase tracking-widest text-muted-brown">
                  {p.code}
                </span>
              </div>

              {/* Location banner */}
              <div
                className="mt-5 mb-8 flex items-start gap-4 rounded-xl px-5 py-4"
                style={{
                  background: 'rgba(0,0,0,0.04)',
                  borderLeft: '4px solid var(--deep-earth)',
                }}
              >
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-terracotta" />
                <div>
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-terracotta">
                    Property Address
                  </span>
                  <p className="mt-0.5 text-sm text-body-brown">{banners[p.key]}</p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {propRooms.map((room, i) => (
                  <Reveal key={room.name} variant="right" delay={(i % 3) * 100}>
                    <RoomCard room={room} />
                  </Reveal>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
