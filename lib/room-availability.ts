import type { AvailabilityRow } from "@/app/api/availability/route"

export type RoomAvailabilitySummary = {
  roomName: string
  propertyName: string | null
  /** True when every night of the stay is free in the cache. */
  available: boolean
  nights: number
  /** Nights with no cache row or marked unavailable. */
  blockedDates: string[]
  avgRate: number | null
  /** True when cache has no rows for this room in range. */
  unknown: boolean
}

/** Stay nights: check-in inclusive, check-out exclusive (hotel standard). */
export function stayNights(checkIn: string, checkOut: string): string[] {
  const start = parseDate(checkIn)
  const end = parseDate(checkOut)
  if (!start || !end || end <= start) return []

  const nights: string[] = []
  const cursor = new Date(start)
  while (cursor < end) {
    nights.push(formatDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return nights
}

/** Last occupied night for API query (check-out day is not a stay night). */
export function availabilityQueryRange(checkIn: string, checkOut: string): { from: string; to: string } | null {
  const nights = stayNights(checkIn, checkOut)
  if (nights.length === 0) return null
  return { from: nights[0], to: nights[nights.length - 1] }
}

export function summarizeAvailability(
  rows: AvailabilityRow[],
  checkIn: string,
  checkOut: string,
): Map<string, RoomAvailabilitySummary> {
  const nights = stayNights(checkIn, checkOut)
  const byRoom = new Map<string, AvailabilityRow[]>()

  for (const row of rows) {
    const key = roomKey(row.room_name, row.property_name)
    const list = byRoom.get(key) ?? []
    list.push(row)
    byRoom.set(key, list)
  }

  const summaries = new Map<string, RoomAvailabilitySummary>()

  for (const [key, roomRows] of byRoom) {
    const sample = roomRows[0]
    const byDate = new Map(roomRows.map((r) => [r.check_date, r]))
    const blockedDates: string[] = []
    const rates: number[] = []

    for (const night of nights) {
      const row = byDate.get(night)
      if (!row || !row.is_available) {
        blockedDates.push(night)
      } else if (row.rate != null) {
        rates.push(row.rate)
      }
    }

    summaries.set(key, {
      roomName: sample.room_name,
      propertyName: sample.property_name,
      available: nights.length > 0 && blockedDates.length === 0,
      nights: nights.length,
      blockedDates,
      avgRate: rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null,
      unknown: roomRows.length === 0,
    })
  }

  return summaries
}

export function roomKey(roomName: string, propertyName: string | null): string {
  return `${propertyName ?? ""}::${roomName}`.toLowerCase()
}

export function formatZarPerNight(amount: number): string {
  return `R ${Math.round(amount).toLocaleString("en-ZA")} / night`
}

function parseDate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const d = new Date(`${iso}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function defaultCheckInOut(): { checkIn: string; checkOut: string } {
  const checkIn = new Date()
  checkIn.setDate(checkIn.getDate() + 1)
  const checkOut = new Date(checkIn)
  checkOut.setDate(checkOut.getDate() + 2)
  return { checkIn: formatDate(checkIn), checkOut: formatDate(checkOut) }
}

export function minCheckInDate(): string {
  return formatDate(new Date())
}
