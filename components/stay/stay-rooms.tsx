"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { MapPin } from "lucide-react"
import { properties as staticProperties, type Property, type PropertyId, type Room } from "@/data/rooms"
import { RoomCard } from "@/components/room-card"
import { MultiCriteriaSearch } from "@/components/search/multi-criteria-search"
import { StayDateSearch } from "@/components/stay/stay-date-search"
import { useAvailability } from "@/hooks/useAvailability"
import { useMediaAssets } from "@/hooks/useMediaAssets"
import { useRoomImages } from "@/hooks/useRoomImages"
import { useSyncedRooms } from "@/hooks/useSyncedRooms"
import { matchesAllCriteria } from "@/lib/match-criteria"
import { defaultCheckInOut } from "@/lib/room-availability"
import { useBookingDates } from "@/hooks/useBookingDates"
import type { SyncedProperty, SyncedRoom } from "@/lib/synced-rooms"
import { LiveDataBadge } from "@/components/stay/live-data-badge"
import { cn } from "@/lib/utils"

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
]

function roomSearchText(room: Room, property: Property) {
  return [
    room.name,
    property.name,
    property.id,
    room.config,
    room.bathroom,
    property.address,
    (room as SyncedRoom).roomTypeName,
  ]
    .filter(Boolean)
    .join(" ")
}

export function StayRooms() {
  const { data, loading, error } = useSyncedRooms()
  const availability = useAvailability()
  const media = useMediaAssets()
  const roomImages = useRoomImages()
  const catalog: SyncedProperty[] =
    data?.properties?.length
      ? data.properties
      : (staticProperties as unknown as SyncedProperty[])
  const isLiveInventory = data?.source === "database"
  const searchParams = useSearchParams()
  const [active, setActive] = useState<PropertyId>("chababa")
  const [criteria, setCriteria] = useState<string[]>([])
  const { checkIn, checkOut, setCheckIn, setCheckOut, reset } = useBookingDates()

  useEffect(() => {
    const urlCheckIn = searchParams.get("checkIn")
    const urlCheckOut = searchParams.get("checkOut")
    // reset() validates the dates through the same rules as manual input:
    // past check-in is clamped to today, invalid checkout is repaired to +2.
    reset({
      checkIn: urlCheckIn || defaultCheckInOut().checkIn,
      checkOut: urlCheckOut || defaultCheckInOut().checkOut,
    })
  }, [reset])

  const initialSearchDone = useRef(false)
  useEffect(() => {
    if (loading || !catalog.length || !checkIn || !checkOut || initialSearchDone.current) return
    initialSearchDone.current = true
    availability.search(checkIn, checkOut)
  }, [loading, catalog.length, checkIn, checkOut, availability.search])

  const activeProperty = catalog.find((p) => p.id === active) ?? catalog[0]

  function passesAvailability(room: Room, property: SyncedProperty) {
    if (!availability.searched) return true
    const summary = availability.getForRoom(room.name, property.name)
    // No cache data for this room → treat as available (unknown ≠ blocked)
    if (!summary) return true
    return summary.available
  }

  const allRooms = useMemo(
    () => catalog.flatMap((p) => p.rooms.map((room) => ({ room, property: p }))),
    [catalog],
  )

  const filteredRooms = useMemo(() => {
    return allRooms.filter(
      ({ room, property }) =>
        matchesAllCriteria(roomSearchText(room, property), criteria) &&
        passesAvailability(room, property),
    )
  }, [allRooms, criteria, availability.searched, availability.byRoom])

  const matchCount = useMemo(() => {
    if (criteria.length > 0 || availability.searched) return filteredRooms.length
    return allRooms.length
  }, [criteria.length, availability.searched, filteredRooms.length, allRooms.length])

  const visibleProperties = useMemo(() => {
    if (criteria.length === 0 && !availability.searched) {
      return activeProperty ? [activeProperty] : []
    }
    return catalog.filter((p) => filteredRooms.some((entry) => entry.property.id === p.id))
  }, [criteria.length, availability.searched, filteredRooms, activeProperty, catalog])

  function roomVisible(room: Room, property: SyncedProperty) {
    if (!passesAvailability(room, property)) return false
    if (criteria.length === 0 && !availability.searched) return property.id === active
    return filteredRooms.some((e) => e.room.name === room.name && e.property.id === property.id)
  }

  function handleSearch() {
    availability.search(checkIn, checkOut)
  }

  function handleClearDates() {
    availability.clear()
    reset(defaultCheckInOut())
  }

  if (loading) {
    return (
      <section className="bg-background py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-full max-w-xl rounded-full bg-muted" />
            <div className="h-32 rounded-2xl bg-muted" />
            <div className="grid gap-6">
              <div className="h-56 rounded-xl bg-muted" />
              <div className="h-56 rounded-xl bg-muted" />
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-background py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <StayDateSearch
          checkIn={checkIn}
          checkOut={checkOut}
          onCheckInChange={setCheckIn}
          onCheckOutChange={setCheckOut}
          onSearch={handleSearch}
          onClear={handleClearDates}
          loading={availability.loading}
          searched={availability.searched}
          availableCount={availability.searched ? filteredRooms.length : undefined}
          className="mb-8"
          gridClassName="lg:items-end"
        />

        {availability.error ? (
          <p className="mb-6 text-sm text-destructive">{availability.error}</p>
        ) : null}

        <div
          className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
          role="tablist"
          aria-label="Select a property"
        >
          {catalog.map((p) => {
            const isActive = criteria.length === 0 && !availability.searched && p.id === active
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
            placeholder="Filter rooms: twin, double, Chababa, bath & shower…"
            suggestions={stayFilterSuggestions}
            criteria={criteria}
            onCriteriaChange={setCriteria}
            matchCount={matchCount}
            matchLabel={matchCount === 1 ? "room meets your criteria" : "rooms meet your criteria"}
          />
        </div>

        {(criteria.length > 0 || availability.searched) && filteredRooms.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <p className="font-serif text-xl text-foreground">
              {availability.searched ? "No rooms available for these dates." : "No rooms match these filters."}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {availability.searched
                ? "Try different dates or clear the search to browse all rooms."
                : "Try removing a filter or browse all properties above."}
            </p>
          </div>
        ) : null}

        {visibleProperties.map((property) => {
          const rooms = property.rooms.filter((room) => roomVisible(room, property))
          if (rooms.length === 0) return null

          return (
            <div key={property.id} className="mt-10">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full" style={{ backgroundColor: property.colorHex }} aria-hidden />
                  <h2 className="font-display text-2xl text-foreground sm:text-3xl">{property.name}</h2>
                </div>
                {property.address ? (
                  <p className="flex items-center gap-2 font-body text-sm text-muted-foreground">
                    <MapPin className="size-4 text-taupe" /> {property.address}
                  </p>
                ) : null}
              </div>

              <div className="grid mt-8 gap-6 lg:grid-cols-1">
                {rooms.map((room) => {
                  const synced = room as SyncedRoom
                  const asset = media.byRoomId.get(synced.bbroomid)
                  const imageFromSupabase = asset?.source === "nightsbridge" && Boolean(asset.source_url)
                  const realPhotos = roomImages.byBbroomid.get(synced.bbroomid)
                  const realPhoto = realPhotos?.[0]
                  return (
                  <RoomCard
                    key={`${property.id}-${room.name}`}
                    room={room}
                    property={property}
                    realImageUrl={realPhoto?.image_url}
                    realImageTitle={realPhoto?.title}
                    imageUrl={asset?.source_url}
                    imageAlt={asset?.alt_text}
                    imageFromSupabase={imageFromSupabase}
                    liveFromSupabase={isLiveInventory}
                    availability={
                      availability.searched
                        ? availability.getForRoom(room.name, property.name)
                        : undefined
                    }
                    checkIn={checkIn || undefined}
                    checkOut={checkOut || undefined}
                  />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
