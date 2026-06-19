import type { BathroomType, BedConfig, Property, PropertyId, Room } from "@/data/rooms"

/** Row from Supabase `room` (+ optional joined `room_type`). */
export type SyncedRoomRow = {
  bbroomid: number
  bbid?: number | null
  room_name: string
  property_name: string | null
  configuration: string | null
  bathroom_type: string | null
  address: string | null
  order_by: number | null
  bbrtid?: number | null
  room_type?: {
    rtname: string | null
    rtdesc: string | null
    max_adults: number | null
    max_occupancy: number | null
    private_bathroom: boolean | null
  } | null
}

export type SyncedRoom = Room & {
  bbroomid: number
  bbid?: number | null
  bbrtid?: number | null
  maxAdults?: number | null
  maxOccupancy?: number | null
  roomTypeName?: string | null
  roomTypeDescription?: string | null
}

export type SyncedProperty = Omit<Property, "rooms"> & {
  rooms: SyncedRoom[]
  syncedRoomCount: number
}

const PROPERTY_META: Record<
  string,
  { id: PropertyId; color: string; colorHex: string }
> = {
  Chababa: { id: "chababa", color: "prop-chababa", colorHex: "#d4a017" },
  "Interlaken A": { id: "interlaken-a", color: "prop-interlaken", colorHex: "#e07b39" },
  Lantana: { id: "lantana", color: "prop-lantana", colorHex: "#5a8f5a" },
  "Transnet Portfolio": { id: "transnet", color: "prop-transnet", colorHex: "#4a6fa5" },
}

function asBedConfig(value: string | null | undefined): BedConfig {
  const v = value?.trim()
  if (v === "Twin" || v === "Double" || v === "Family" || v === "Triple" || v === "TBC") return v
  return "TBC"
}

function asBathroomType(value: string | null | undefined): BathroomType {
  const v = value?.trim()
  if (
    v === "Bath only" ||
    v === "Shower only" ||
    v === "Bath & Shower" ||
    v === "TBC"
  ) {
    return v
  }
  return "TBC"
}

function propertySlug(name: string): PropertyId {
  const meta = PROPERTY_META[name]
  if (meta) return meta.id
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") as PropertyId
}

function mergeRoom(row: SyncedRoomRow): { propertyName: string; room: SyncedRoom } | null {
  const propertyName = row.property_name?.trim()
  if (!propertyName) return null

  const rt = row.room_type
  const description = rt?.rtdesc?.trim() || ""

  const room: SyncedRoom = {
    bbroomid: row.bbroomid,
    bbid: row.bbid ?? null,
    bbrtid: row.bbrtid,
    name: row.room_name,
    config: asBedConfig(row.configuration),
    bathroom: asBathroomType(row.bathroom_type),
    description,
    maxAdults: rt?.max_adults ?? null,
    maxOccupancy: rt?.max_occupancy ?? null,
    roomTypeName: rt?.rtname?.trim() || null,
    roomTypeDescription: rt?.rtdesc?.trim() || null,
  }

  return { propertyName, room }
}

/** Build property groups from NightsBridge-synced rows only (no static catalog). */
export function buildSyncedProperties(rows: SyncedRoomRow[]): SyncedProperty[] {
  const byProperty = new Map<string, { rows: SyncedRoomRow[]; rooms: SyncedRoom[] }>()

  for (const row of rows) {
    const merged = mergeRoom(row)
    if (!merged) continue

    const entry = byProperty.get(merged.propertyName) ?? { rows: [], rooms: [] }
    entry.rows.push(row)
    entry.rooms.push(merged.room)
    byProperty.set(merged.propertyName, entry)
  }

  return [...byProperty.entries()]
    .map(([propertyName, { rows, rooms }]) => {
      const meta = PROPERTY_META[propertyName]
      const address = rows.find((r) => r.address?.trim())?.address?.trim() ?? ""

      rooms.sort((a, b) => {
        const orderA = rows.find((r) => r.room_name === a.name)?.order_by ?? 999
        const orderB = rows.find((r) => r.room_name === b.name)?.order_by ?? 999
        if (orderA !== orderB) return orderA - orderB
        return a.name.localeCompare(b.name)
      })

      return {
        id: meta?.id ?? propertySlug(propertyName),
        name: propertyName,
        code: "",
        address,
        tagline: "",
        color: meta?.color ?? "prop-chababa",
        colorHex: meta?.colorHex ?? "#d4a017",
        roomCount: rooms.length,
        description: "",
        locationNote: "",
        whatsapp: "",
        rooms,
        syncedRoomCount: rooms.length,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}
