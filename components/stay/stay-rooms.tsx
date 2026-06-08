"use client"

import { useMemo, useState } from "react"
import { MapPin } from "lucide-react"
import { properties, type PropertyId, type Property, type Room } from "@/data/rooms"
import { RoomCard } from "@/components/room-card"
import { MultiCriteriaSearch } from "@/components/search/multi-criteria-search"
import { matchesAllCriteria } from "@/lib/match-criteria"
import { cn } from "@/lib/utils"

const COLOR_VARS: Record<string, string> = {
  chababa: "var(--color-chababa)",
  "interlaken-a": "var(--color-interlaken)",
  lantana: "var(--color-lantana)",
  transnet: "var(--color-transnet)",
}

const stayFilterSuggestions = [
  "Twin",
  "Double",
  "Family",
  "Triple",
  "Chababa",
  "Interlaken",
  "Lantana",
  "Bath",
  "Shower",
  "Mahikeng",
]

function roomSearchText(room: Room, property: Property) {
  return [room.name, property.name, property.id, property.code, room.config, room.bathroom, property.address, property.tagline].join(" ")
}

export function StayRooms() {
  const [active, setActive] = useState<PropertyId>("chababa")
  const [criteria, setCriteria] = useState<string[]>([])
  const activeProperty = properties.find((p) => p.id === active)!

  const allRooms = useMemo(
    () => properties.flatMap((p) => p.rooms.map((room) => ({ room, property: p }))),
    [],
  )

  const filteredRooms = useMemo(() => {
    return allRooms.filter(({ room, property }) => matchesAllCriteria(roomSearchText(room, property), criteria))
  }, [allRooms, criteria])

  const matchCount = criteria.length > 0 ? filteredRooms.length : allRooms.length

  const visibleProperties = useMemo(() => {
    if (criteria.length === 0) return [activeProperty]
    return properties.filter((p) =>
      filteredRooms.some((entry) => entry.property.id === p.id),
    )
  }, [criteria.length, filteredRooms, activeProperty])

  function roomVisible(room: Room, property: Property) {
    if (criteria.length === 0) return property.id === active
    return filteredRooms.some((e) => e.room.name === room.name && e.property.id === property.id)
  }

  return (
    <section className="bg-background py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
          role="tablist"
          aria-label="Select a property"
        >
          {properties.map((p) => {
            const isActive = criteria.length === 0 && p.id === active
            return (
              <button
                key={p.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setCriteria([])
                  setActive(p.id)
                }}
                className={cn(
                  "inline-flex shrink-0 items-center rounded-full px-5 py-2.5 font-mono text-[11px] tracking-[0.12em] uppercase transition-all duration-250",
                  isActive ? "border-transparent text-white" : "border bg-white hover:border-current",
                )}
                style={
                  isActive
                    ? { backgroundColor: p.colorHex, borderColor: "transparent" }
                    : { color: p.colorHex, borderColor: `${p.colorHex}66` }
                }
              >
                {p.name}
                <span className={cn("ml-2 rounded-full px-1.5 py-0.5 text-[9px]", isActive ? "bg-white/20" : "bg-black/5")}>
                  {p.roomCount}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <MultiCriteriaSearch
            placeholder="Filter rooms — twin, double, Chababa, bath & shower…"
            suggestions={stayFilterSuggestions}
            criteria={criteria}
            onCriteriaChange={setCriteria}
            matchCount={matchCount}
            matchLabel={matchCount === 1 ? "room meets your criteria" : "rooms meet your criteria"}
          />
        </div>

        {criteria.length > 0 && filteredRooms.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <p className="font-serif text-xl text-foreground">No rooms match these filters.</p>
            <p className="mt-2 text-sm text-muted-foreground">Try removing a filter or browse all properties above.</p>
          </div>
        ) : null}

        {(criteria.length > 0 ? visibleProperties : [activeProperty]).map((property) => {
          const rooms = property.rooms.filter((room) => roomVisible(room, property))
          if (rooms.length === 0) return null

          return (
            <div key={property.id} className="mt-10">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full" style={{ backgroundColor: property.colorHex }} aria-hidden />
                  <h2 className="font-display text-2xl text-foreground sm:text-3xl">
                    {property.name} — {property.code}
                  </h2>
                </div>
                <p className="max-w-2xl font-body text-pretty leading-relaxed text-muted-foreground">
                  {property.description}
                </p>
                <p className="flex items-center gap-2 font-body text-sm text-muted-foreground">
                  <MapPin className="size-4 text-taupe" /> {property.address}
                </p>
              </div>

              <div
                className="mb-8 mt-6 flex items-start gap-3 rounded-lg p-4"
                style={{
                  borderLeft: `3px solid ${COLOR_VARS[property.id] ?? property.colorHex}`,
                  background: `${property.colorHex}0f`,
                }}
              >
                <MapPin className="mt-0.5 size-4 shrink-0" style={{ color: property.colorHex }} />
                <div>
                  <p className="font-body text-sm font-medium text-[#0A0A0A]">Confirm your arrival address</p>
                  <p className="mt-0.5 font-mono text-[11px] tracking-wide text-taupe">{property.address}</p>
                  <p className="mt-2 font-body text-sm leading-relaxed text-body-text">{property.locationNote}</p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-1">
                {rooms.map((room) => (
                  <RoomCard key={`${property.id}-${room.name}`} room={room} property={property} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
