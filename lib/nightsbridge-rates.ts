/**
 * NightsBridge rates — public API.
 *
 * Source priority:
 *  1. callAvailGrid    — POST /bridge/api/5.0/availgrid          (primary, live)
 *  2. callAvailability — POST /bridge/api/5.0/availability/{bbid} (fallback, live)
 *  3. rate_cache table in Supabase                                (stale cache)
 *  4. availability_cache + room_type in Supabase                  (no rack rates)
 */

import { createSupabaseAnonClient } from "@/lib/supabase/client"
import { callAvailGrid, callAvailability } from "@/lib/nightsbridge-api"

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type RoomRate = {
  /** NightsBridge numeric room type ID (rtid). Present for live API results. */
  rtid?: number | null
  rtname: string
  /** Physical room ID — present only when data comes from Supabase. */
  bbroomid: number | null
  description: string | null
  maxGuests: number | null
  maxAdults: number | null
  childrenPolicy: string | null
  rateSingle: number | null
  rateDouble: number | null
  available: boolean
  imageUrl: string | null
}

/** One mealplan option with per-night rates (divide total by nights in caller). */
export type MealPlanRate = {
  mealplanid: number
  description: string // "Room Only" | "Bed & Breakfast" | "Dinner, Bed & Breakfast"
  rateSingle: number | null // per night, 1 adult
  rateDouble: number | null // per night, 2 adults
}

export type RatesResult = {
  rates: RoomRate[]
  /** Where the data came from. */
  source: "live" | "rate_cache" | "supabase" | "error"
  error?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatZAR(amount: number): string {
  return `R ${Math.round(amount).toLocaleString("en-ZA")}`
}

function stayNights(arrive: string, depart: string): string[] {
  const nights: string[] = []
  const end = new Date(`${depart}T12:00:00`)
  const cur = new Date(`${arrive}T12:00:00`)
  if (Number.isNaN(end.getTime()) || Number.isNaN(cur.getTime())) return []
  while (cur < end) {
    nights.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return nights
}

// ---------------------------------------------------------------------------
// Attempt 3: rate_cache Supabase table
// ---------------------------------------------------------------------------

async function fetchFromRateCache(
  bbid: number,
  arrive: string,
  depart: string,
): Promise<RoomRate[] | null> {
  try {
    const supabase = createSupabaseAnonClient()
    const { data, error } = await supabase
      .from("rate_cache")
      .select("rtname, rate_single, rate_double, available")
      .eq("bbid", bbid)
      .eq("arrive", arrive)
      .eq("depart", depart)
      // Only use cache rows that are less than 10 minutes old
      .gte("scraped_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
    if (error || !data?.length) return null
    return data.map((row) => ({
      rtname: row.rtname,
      bbroomid: null,
      description: null,
      maxGuests: null,
      maxAdults: null,
      childrenPolicy: null,
      rateSingle: row.rate_single ? Number(row.rate_single) : null,
      rateDouble: row.rate_double ? Number(row.rate_double) : null,
      available: row.available ?? true,
      imageUrl: null,
    }))
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Attempt 4: Supabase availability_cache + room_type
// ---------------------------------------------------------------------------

async function fetchFromSupabase(
  bbid: number,
  arrive: string,
  depart: string,
): Promise<RatesResult> {
  try {
    const supabase = createSupabaseAnonClient()
    const nights = stayNights(arrive, depart)
    if (!nights.length) return { rates: [], source: "error", error: "Invalid date range" }

    const { data: rooms, error: roomError } = await supabase
      .from("room")
      .select(
        `
        bbroomid,
        room_name,
        room_type (
          rtname,
          rtdesc,
          max_adults,
          max_occupancy
        )
      `,
      )
      .eq("bbid", bbid)
      .eq("is_active", true)

    if (roomError || !rooms?.length) {
      return {
        rates: [],
        source: "error",
        error: roomError?.message ?? "No rooms found in Supabase",
      }
    }

    const roomIds = rooms.map((r) => r.bbroomid)

    const { data: cache } = await supabase
      .from("availability_cache")
      .select("bbroomid, check_date, is_available, rate")
      .in("bbroomid", roomIds)
      .gte("check_date", nights[0])
      .lte("check_date", nights[nights.length - 1])

    const cacheMap = new Map<string, { is_available: boolean; rate: number | null }>()
    for (const row of cache ?? []) {
      cacheMap.set(`${row.bbroomid}::${row.check_date}`, {
        is_available: row.is_available,
        rate: row.rate != null ? Number(row.rate) : null,
      })
    }

    const availMap = new Map<number, { available: boolean; rate: number | null }>()
    for (const room of rooms) {
      let allAvailable = true
      const rateValues: number[] = []
      for (const night of nights) {
        const entry = cacheMap.get(`${room.bbroomid}::${night}`)
        if (entry && !entry.is_available) allAvailable = false
        if (entry?.rate != null) rateValues.push(entry.rate)
      }
      availMap.set(room.bbroomid, {
        available: allAvailable,
        rate:
          rateValues.length
            ? rateValues.reduce((a, b) => a + b, 0) / rateValues.length
            : null,
      })
    }

    const { data: media } = await supabase
      .from("media_asset")
      .select("bbroomid, source_url")
      .in("bbroomid", roomIds)
      .eq("entity_type", "room")
      .eq("is_primary", true)

    const imageMap = new Map<number, string>()
    for (const m of media ?? []) {
      if (m.bbroomid && m.source_url) imageMap.set(m.bbroomid, m.source_url)
    }

    const rates: RoomRate[] = rooms.map((room) => {
      const rt = (room.room_type ?? null) as {
        rtname?: string | null
        rtdesc?: string | null
        max_adults?: number | null
        max_occupancy?: number | null
      } | null
      const avail = availMap.get(room.bbroomid) ?? { available: true, rate: null }
      return {
        rtname: rt?.rtname?.trim() || room.room_name,
        bbroomid: room.bbroomid,
        description: rt?.rtdesc?.trim() || null,
        maxGuests: rt?.max_occupancy ?? null,
        maxAdults: rt?.max_adults ?? null,
        childrenPolicy: null,
        // avgrate from confirmed bookings only — NOT rack rates
        rateSingle: avail.rate,
        rateDouble: avail.rate,
        available: avail.available,
        imageUrl: imageMap.get(room.bbroomid) ?? null,
      }
    })

    rates.sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1
      return a.rtname.localeCompare(b.rtname)
    })

    return { rates, source: "supabase" }
  } catch (err) {
    return {
      rates: [],
      source: "error",
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch live NightsBridge room rates for a stay window.
 *
 * Tries the live NightsBridge Bridge API first (availgrid then availability),
 * then falls through to Supabase cache if all network calls fail.
 *
 * Note: the new NightsBridge availgrid format returns roomsfree:boolean per night
 * but omits rate data. We merge availability from availgrid with rates from the
 * /availability endpoint so the caller always gets both.
 */
export async function fetchNightsBridgeRates(
  bbid: number,
  arrive: string,
  depart: string,
): Promise<RatesResult> {
  // 1. Live NightsBridge availgrid API — accurate per-night availability
  const gridRates = await callAvailGrid(bbid, arrive, depart)

  if (gridRates?.length) {
    const hasRates = gridRates.some((r) => r.rateSingle != null || r.rateDouble != null)
    if (hasRates) return { rates: gridRates, source: "live" }

    // New API: availgrid has availability but no rates — fetch rates separately and merge
    const availRates = await callAvailability(bbid, arrive, depart)
    if (availRates?.length) {
      const rateMap = new Map(availRates.map((r) => [r.rtname.toLowerCase().trim(), r]))
      const merged = gridRates.map((r) => {
        const rateData = rateMap.get(r.rtname.toLowerCase().trim())
        return rateData
          ? { ...r, rateSingle: rateData.rateSingle, rateDouble: rateData.rateDouble }
          : r
      })
      return { rates: merged, source: "live" }
    }
    // No rates available from either endpoint — still return availability
    return { rates: gridRates, source: "live" }
  }

  // 2. Fallback: availability endpoint alone (has both availability + rates)
  const availRates = await callAvailability(bbid, arrive, depart)
  if (availRates?.length) return { rates: availRates, source: "live" }

  // 3. Stale rate_cache (written by previous successful API calls)
  const cached = await fetchFromRateCache(bbid, arrive, depart)
  if (cached?.length) return { rates: cached, source: "rate_cache" }

  // 4. Supabase availability_cache + room_type (always available after sync)
  return fetchFromSupabase(bbid, arrive, depart)
}

// ---------------------------------------------------------------------------
// Room matching
// ---------------------------------------------------------------------------

const BED_WORDS = /\b(twin|double|family|triple|single|queen|king)\b/i
const BATH_WORDS = /\b(shower|bath)\b/gi

/**
 * Find the selected room in a rates list.
 *
 * Match priority:
 *  1. Exact string match on roomTypeName (Supabase room_type.rtname = NightsBridge rtname)
 *  2. Partial inclusion on roomTypeName
 *  3. bbroomid match (Supabase-sourced data)
 *  4. Fuzzy: bed-type word AND bathroom word both overlap
 *  5. Partial room name inclusion
 */
export function findSelectedRate(
  rates: RoomRate[],
  bbroomid: number | null,
  roomName: string | null,
  roomTypeName: string | null,
  config?: string | null,
  bathroom?: string | null,
): RoomRate | null {
  if (!rates.length) return null

  // 1. Exact match on room type name (most reliable key)
  if (roomTypeName) {
    const exact = rates.find(
      (r) => r.rtname.toLowerCase() === roomTypeName.toLowerCase(),
    )
    if (exact) return exact

    const partial = rates.find(
      (r) =>
        r.rtname.toLowerCase().includes(roomTypeName.toLowerCase()) ||
        roomTypeName.toLowerCase().includes(r.rtname.toLowerCase()),
    )
    if (partial) return partial
  }

  // 2. bbroomid (Supabase rows)
  if (bbroomid) {
    const byId = rates.find((r) => r.bbroomid === bbroomid)
    if (byId) return byId
  }

  // 3. Fuzzy bed + bathroom overlap
  const haystack =
    `${roomTypeName ?? ""} ${roomName ?? ""} ${config ?? ""} ${bathroom ?? ""}`.toLowerCase()
  const haystackBed = haystack.match(BED_WORDS)?.[1]
  const haystackBath = [...haystack.matchAll(BATH_WORDS)].map((m) => m[1])

  if (haystackBed) {
    const fuzzy = rates.find((r) => {
      const a = r.rtname.toLowerCase()
      const aBed = a.match(BED_WORDS)?.[1]
      if (!aBed || aBed !== haystackBed) return false
      if (haystackBath.length > 0) {
        const aBath = [...a.matchAll(BATH_WORDS)].map((m) => m[1])
        if (aBath.length > 0) {
          return haystackBath.some((b) =>
            aBath.some((ab) => b.startsWith(ab) || ab.startsWith(b)),
          )
        }
      }
      return true
    })
    if (fuzzy) return fuzzy
  }

  // 4. Partial room name inclusion
  if (roomName) {
    const lc = roomName.toLowerCase()
    const partial = rates.find(
      (r) =>
        r.rtname.toLowerCase().includes(lc) ||
        lc.includes(r.rtname.toLowerCase()),
    )
    if (partial) return partial
  }

  return null
}
