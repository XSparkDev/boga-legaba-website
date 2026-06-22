/**
 * Direct NightsBridge Bridge API client.
 *
 * Discovered by intercepting XHR from the public booking widget
 * (https://book.nightsbridge.com/21091). No authentication required.
 *
 * ─────────────────────────────────────────────────────────────────
 * PRIMARY:  POST https://www.nightsbridge.com/bridge/api/5.0/availgrid
 *   Body:   { bbid, startdate (arrive), enddate (depart), showroomcount:false, ... }
 *   Returns per-night entries per room type:
 *     roomtypes[].rtid             — numeric room type ID
 *     roomtypes[].rtname           — room type name
 *     roomtypes[].availability[]   — entries from startdate..enddate INCLUSIVE
 *                                    (nights+1 entries; only first `nights` are stay nights)
 *       .noroomsfree               — number of rooms free that night (showroomcount:false)
 *       .closeoutrs.closedout      — true = property has closed it out
 *       .rates[0].paxrate          — 1-adult per-night rate
 *       .rates[1].paxrate          — 2-adult per-night rate
 *       .rates[2].paxrate          — 3-adult per-night rate (family/triple rooms)
 *
 * FALLBACK: POST https://www.nightsbridge.com/bridge/api/5.0/availability/{bbid}
 *   Returns TOTAL rates for the full stay (divide by nights for per-night display).
 *     roomtypes[].roomtypename
 *     roomtypes[].roomsfree        — number of rooms free across the stay (0 = sold)
 *     roomtypes[].mealplans[]      — defaultmealplan.rates = [total_1adult, total_2adult, ...]
 * ─────────────────────────────────────────────────────────────────
 */

import type { RoomRate, MealPlanRate } from "@/lib/nightsbridge-rates"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

// ---------------------------------------------------------------------------
// Shared request infrastructure
// ---------------------------------------------------------------------------

const NB_HEADERS = {
  "Content-Type": "application/json",
  "Origin": "https://book.nightsbridge.com",
  "Referer": "https://book.nightsbridge.com/",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
}

/** Number of stay nights between two YYYY-MM-DD strings. */
function stayNightCount(arrive: string, depart: string): number {
  const ms =
    new Date(`${depart}T12:00:00Z`).getTime() -
    new Date(`${arrive}T12:00:00Z`).getTime()
  return Math.max(1, Math.round(ms / 86_400_000))
}

// Simple module-level TTL cache to avoid hammering the API on every SSR render.
const _cache = new Map<string, { rates: RoomRate[]; ts: number }>()
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

function getCached(key: string): RoomRate[] | null {
  const entry = _cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    _cache.delete(key)
    return null
  }
  return entry.rates
}

function setCached(key: string, rates: RoomRate[]): void {
  _cache.set(key, { rates, ts: Date.now() })
}

// ---------------------------------------------------------------------------
// Upsert to rate_cache (side-effect, non-fatal)
// ---------------------------------------------------------------------------

async function saveToRateCache(
  rates: RoomRate[],
  bbid: number,
  arrive: string,
  depart: string,
): Promise<void> {
  if (!rates.length) return
  try {
    const admin = createSupabaseAdminClient()
    const rows = rates.map((r) => ({
      bbid,
      rtname: r.rtname,
      rate_single: r.rateSingle,
      rate_double: r.rateDouble,
      available: r.available,
      arrive,
      depart,
      scraped_at: new Date().toISOString(),
    }))
    await admin
      .from("rate_cache")
      .upsert(rows, { onConflict: "bbid,rtname,arrive,depart" })
  } catch {
    // Non-fatal
  }
}

// ---------------------------------------------------------------------------
// PRIMARY: availgrid endpoint
// ---------------------------------------------------------------------------

/**
 * Raw shape for /bridge/api/5.0/availgrid.
 * NightsBridge changed the per-night availability entry format:
 *   Old: { noroomsfree: number, closeoutrs: {...}, rates: [{paxrate}] }
 *   New: { roomsfree: boolean }  (no rates — fetch those from /availability)
 */
type AvailGridResponse = {
  success: boolean
  error?: { code: number }
  data?: {
    bbid: number
    roomtypes: Array<{
      rtid: number
      rtname: string
      description: string
      maxoccupancy: number
      maxadults: number
      childpolicy: string
      availability: Array<{
        // New format (boolean)
        roomsfree?: boolean
        // Old format (number — kept for backward compat)
        noroomsfree?: number
        closeoutrs?: { closedout: boolean; bbrtid: number; closeouttype: string }
        rates?: Array<{ paxrate: number }>
        roomrate?: number
      }>
    }>
  }
}

/**
 * Call /bridge/api/5.0/availgrid for exact arrive→depart dates.
 *
 * - Uses showroomcount: false → each availability entry has noroomsfree: number.
 * - The API returns (nights + 1) entries because enddate is inclusive.
 *   We slice to [0, nights) to check only the actual stay nights.
 * - Rates = MIN across stay nights ("from" price, matching what the widget shows).
 */
export async function callAvailGrid(
  bbid: number,
  arrive: string,
  depart: string,
): Promise<RoomRate[] | null> {
  const cacheKey = `availgrid::${bbid}::${arrive}::${depart}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const nights = stayNightCount(arrive, depart)

  try {
    const res = await fetch("https://www.nightsbridge.com/bridge/api/5.0/availgrid", {
      method: "POST",
      headers: NB_HEADERS,
      body: JSON.stringify({
        bbid,
        nbid: 0,
        extbbid: "",
        clientloginkey: null,
        startdate: arrive,
        enddate: depart,       // inclusive — array has nights+1 entries
        bbrtid: 0,
        rtgroupid: 0,
        nightsbridge: true,
        showroomcount: false,  // → noroomsfree: number (actual count, not boolean)
        showrates: true,
        showextras: false,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      console.warn(`[NB availgrid] HTTP ${res.status}`)
      return null
    }

    const json = (await res.json()) as AvailGridResponse

    if (!json.success || !json.data?.roomtypes?.length) {
      console.warn("[NB availgrid] success=false or no roomtypes")
      return null
    }

    const rates: RoomRate[] = json.data.roomtypes.map((rt) => {
      // Slice to only the actual stay nights (exclude the checkout-date entry)
      const stayNights = (rt.availability ?? []).slice(0, nights)

      // Available iff EVERY stay night has rooms free.
      // NightsBridge changed format: new API uses roomsfree:boolean, old used noroomsfree:number.
      const available =
        stayNights.length > 0 &&
        stayNights.every((n) => {
          if (typeof n.roomsfree === "boolean") return n.roomsfree
          return (n.noroomsfree ?? 0) > 0 && !n.closeoutrs?.closedout
        })

      // Rates from availgrid (old format only — new format omits them; caller merges from /availability)
      const singlePrices = stayNights
        .map((n) => n.rates?.[0]?.paxrate)
        .filter((v): v is number => typeof v === "number" && v > 0)
      const doublePrices = stayNights
        .map((n) => n.rates?.[1]?.paxrate ?? n.roomrate)
        .filter((v): v is number => typeof v === "number" && v > 0)

      return {
        rtid: rt.rtid,
        rtname: rt.rtname,
        bbroomid: null,
        description: rt.description || null,
        maxGuests: rt.maxoccupancy ?? null,
        maxAdults: rt.maxadults ?? null,
        childrenPolicy: rt.childpolicy || null,
        rateSingle: singlePrices.length ? Math.min(...singlePrices) : null,
        rateDouble: doublePrices.length ? Math.min(...doublePrices) : null,
        available,
        imageUrl: null,
      }
    })

    // Sort: available first, then alphabetically
    rates.sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1
      return a.rtname.localeCompare(b.rtname)
    })

    console.log(
      `[NB availgrid] ${rates.length} room types · ${nights} nights` +
        ` · ${rates.filter((r) => r.available).length} available`,
    )

    setCached(cacheKey, rates)
    void saveToRateCache(rates, bbid, arrive, depart)
    return rates
  } catch (err) {
    console.warn("[NB availgrid] fetch error:", err)
    return null
  }
}

// ---------------------------------------------------------------------------
// FALLBACK: availability endpoint
// ---------------------------------------------------------------------------

/**
 * Raw shape for /bridge/api/5.0/availability/{bbid}.
 * When queried with the full stay range, mealplan rates are TOTALS for the stay.
 * Divide by nights to display per-night rates.
 */
type AvailabilityResponse = {
  success: boolean
  error?: { code: number }
  data?: {
    nights?: number
    roomtypes: Array<{
      rtid: number
      roomtypename: string
      description: string
      maxoccupancy: number
      maxadults: number
      roomsfree: number
      childpolicy: {
        description: string
      }
      mealplans: Array<{
        mealplanid: number
        description: string
        defaultmealplan: boolean
        rates: number[] // TOTAL for stay; divide by nights for per-night
      }>
    }>
  }
}

/**
 * Call /bridge/api/5.0/availability/{bbid} for the full stay range.
 *
 * Rates returned are TOTAL for the stay period — divide by `nights` to get
 * the per-night rate suitable for display.
 */
export async function callAvailability(
  bbid: number,
  arrive: string,
  depart: string,
): Promise<RoomRate[] | null> {
  const cacheKey = `availability::${bbid}::${arrive}::${depart}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const nights = stayNightCount(arrive, depart)

  try {
    const res = await fetch(
      `https://www.nightsbridge.com/bridge/api/5.0/availability/${bbid}`,
      {
        method: "POST",
        headers: NB_HEADERS,
        body: JSON.stringify({
          bbid,
          startdate: arrive,
          enddate: depart,
          nightsbridge: true,
          bbrtid: 0,
          rtgroupid: 0,
          nbid: 0,
          promocode: "",
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    )

    if (!res.ok) {
      console.warn(`[NB availability] HTTP ${res.status}`)
      return null
    }

    const json = (await res.json()) as AvailabilityResponse

    if (!json.success || !json.data?.roomtypes?.length) {
      console.warn("[NB availability] success=false or no roomtypes")
      return null
    }

    const rates: RoomRate[] = json.data.roomtypes.map((rt) => {
      // Default mealplan = Room Only (mealplanid 5); fall back to first
      const mealplan =
        rt.mealplans.find((m) => m.defaultmealplan) ?? rt.mealplans[0] ?? null

      // Rates are TOTALS for the stay — divide to get per-night
      const totalSingle = mealplan?.rates?.[0] ?? null
      const totalDouble = mealplan?.rates?.[1] ?? null
      const rateSingle = totalSingle != null ? totalSingle / nights : null
      const rateDouble = totalDouble != null ? totalDouble / nights : null

      return {
        rtid: rt.rtid,
        rtname: rt.roomtypename,
        bbroomid: null,
        description: rt.description || null,
        maxGuests: rt.maxoccupancy ?? null,
        maxAdults: rt.maxadults ?? null,
        childrenPolicy: rt.childpolicy?.description || null,
        rateSingle: rateSingle != null && rateSingle > 0 ? rateSingle : null,
        rateDouble: rateDouble != null && rateDouble > 0 ? rateDouble : null,
        available: (rt.roomsfree ?? 0) > 0,
        imageUrl: null,
      }
    })

    rates.sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1
      return a.rtname.localeCompare(b.rtname)
    })

    console.log(`[NB availability] ${rates.length} room types · arrive=${arrive}`)

    setCached(cacheKey, rates)
    return rates
  } catch (err) {
    console.warn("[NB availability] fetch error:", err)
    return null
  }
}

// ---------------------------------------------------------------------------
// All mealplan rates per room type
// ---------------------------------------------------------------------------

const _mealPlanCache = new Map<string, { data: Map<number, MealPlanRate[]>; ts: number }>()

/**
 * Fetch ALL mealplan options for every room type in a single stay window.
 * Returns Map<rtid, MealPlanRate[]> (rates are PER NIGHT).
 *
 * Uses the same /availability/{bbid} endpoint but extracts every mealplan,
 * not just the default one.
 */
export async function fetchMealPlanRates(
  bbid: number,
  arrive: string,
  depart: string,
): Promise<Map<number, MealPlanRate[]> | null> {
  const cacheKey = `mealplans::${bbid}::${arrive}::${depart}`
  const hit = _mealPlanCache.get(cacheKey)
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.data

  const nights = stayNightCount(arrive, depart)

  try {
    const res = await fetch(
      `https://www.nightsbridge.com/bridge/api/5.0/availability/${bbid}`,
      {
        method: "POST",
        headers: NB_HEADERS,
        body: JSON.stringify({
          bbid,
          startdate: arrive,
          enddate: depart,
          nightsbridge: true,
          bbrtid: 0,
          rtgroupid: 0,
          nbid: 0,
          promocode: "",
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    )
    if (!res.ok) return null

    const json = (await res.json()) as AvailabilityResponse
    if (!json.success || !json.data?.roomtypes?.length) return null

    const result = new Map<number, MealPlanRate[]>()
    for (const rt of json.data.roomtypes) {
      const plans: MealPlanRate[] = rt.mealplans
        .filter((m) => m.rates?.length)
        .map((m) => {
          const totalSingle = m.rates?.[0] ?? null
          const totalDouble = m.rates?.[1] ?? null
          return {
            mealplanid: m.mealplanid,
            description: m.description,
            rateSingle: totalSingle != null && totalSingle > 0 ? totalSingle / nights : null,
            rateDouble: totalDouble != null && totalDouble > 0 ? totalDouble / nights : null,
          }
        })
        .filter((p) => p.rateSingle != null || p.rateDouble != null)

      if (plans.length) result.set(rt.rtid, plans)
    }

    _mealPlanCache.set(cacheKey, { data: result, ts: Date.now() })
    console.log(`[NB mealplans] ${result.size} room types with meal plan data`)
    return result
  } catch (err) {
    console.warn("[NB mealplans] fetch error:", err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Establishment endpoint — images, amenities, room details, property info
// ---------------------------------------------------------------------------

export type NbImage = {
  big: string
  medium: string
  small: string
  categoryname: string
}

export type NbAmenityGroup = {
  group: string // "In-Room" | "Bathroom" | "Kitchen"
  amenities: Array<{ otaamenitycode: string; description: string }>
}

export type NbRoomTypeDetail = {
  rtid: number
  name: string
  description: string
  roomSizeM2: number | null
  quality: string | null
  roomType: string | null      // "Double Room" | "Family Room"
  maxOccupancy: number | null
  maxAdults: number | null
  bedTypes: Array<{ description: string; bedcount: number }>
  amenityGroups: NbAmenityGroup[]
  images: NbImage[]
  allowSmoking: boolean
}

export type EstablishmentData = {
  name: string
  teaser: string | null
  generaldescription: string | null
  areainfo: string | null
  attractions: string | null        // bulleted list of nearby attractions
  directions: string | null         // driving directions to the property
  address: string | null
  lat: number | null
  lng: number | null
  checkintime: string | null
  checkouttime: string | null
  wifi: string | null
  wificost: string | null
  parking: string | null
  allowPet: string | null
  allowSmoking: boolean
  grading: Array<{ gradingauthority: string; grade: string }>
  propertyAmenities: Array<{ code: string; description: string }>
  propertyImages: NbImage[]
  cancellationPolicy: string | null
  tripadvisorLocationId: string | null
  roomTypes: Map<number, NbRoomTypeDetail>
}

const _establishmentCache = new Map<number, { data: EstablishmentData; ts: number }>()
const ESTABLISHMENT_TTL_MS = 60 * 60 * 1000 // 1 hour — rarely changes

export async function fetchEstablishment(bbid: number): Promise<EstablishmentData | null> {
  const hit = _establishmentCache.get(bbid)
  if (hit && Date.now() - hit.ts < ESTABLISHMENT_TTL_MS) return hit.data

  try {
    const res = await fetch(
      `https://www.nightsbridge.com/bridge/api/5.0/establishment/${bbid}`,
      {
        method: "GET",
        headers: NB_HEADERS,
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    )
    if (!res.ok) return null

    const json = (await res.json()) as {
      success: boolean
      data?: {
        contentrs?: {
          name?: string
          teaser?: string
          generaldescription?: string
          areainfo?: string
          attractions?: string
          directions?: string
          address?: string
          lat?: number
          lng?: number
          checkintime?: string
          checkouttime?: string
          wifi?: string
          wificost?: string
          parking?: string
          allowpet?: string
          allowsmoking?: boolean
          grading?: Array<{ gradingauthority: string; grade: string }>
          propertyamenities?: Array<{ code: string; description: string }>
          cancellationpolicy?: { description?: string }
          tripadvisorextbbid?: string
          roomtypes?: Array<{
            roomtypeid: number
            roomtypename: string
            description: string
            roomsizeinmeters?: number
            quality?: string
            roomtype?: string
            maxoccupancy?: number
            maxadults?: number
            allowsmoking?: boolean
            bedtypes?: Array<{ description: string; bedcount: number; roomnumber: number }>
            roomtypeamenitygroups?: Array<{
              group: string
              amenities: Array<{ otaamenitycode: string; description: string }>
            }>
          }>
        }
        images?: {
          propertygallery?: NbImage[]
          roomtypegalleries?: Array<{
            roomtypeid: number
            gallery: NbImage[]
          }>
        }
      }
    }

    if (!json.success || !json.data) return null

    const c = json.data.contentrs ?? {}
    const imgs = json.data.images ?? {}

    // Build roomtypeid → images map
    const rtImageMap = new Map<number, NbImage[]>()
    for (const g of imgs.roomtypegalleries ?? []) {
      rtImageMap.set(g.roomtypeid, g.gallery ?? [])
    }

    // Build roomTypes map
    const roomTypes = new Map<number, NbRoomTypeDetail>()
    for (const rt of c.roomtypes ?? []) {
      roomTypes.set(rt.roomtypeid, {
        rtid: rt.roomtypeid,
        name: rt.roomtypename,
        description: rt.description,
        roomSizeM2: rt.roomsizeinmeters ?? null,
        quality: rt.quality ?? null,
        roomType: rt.roomtype ?? null,
        maxOccupancy: rt.maxoccupancy ?? null,
        maxAdults: rt.maxadults ?? null,
        bedTypes: (rt.bedtypes ?? []).map((b) => ({
          description: b.description,
          bedcount: b.bedcount,
        })),
        amenityGroups: rt.roomtypeamenitygroups ?? [],
        images: rtImageMap.get(rt.roomtypeid) ?? [],
        allowSmoking: rt.allowsmoking ?? false,
      })
    }

    const data: EstablishmentData = {
      name: c.name ?? "",
      teaser: c.teaser?.trim() || null,
      generaldescription: c.generaldescription?.trim() || null,
      areainfo: c.areainfo?.trim() || null,
      attractions: c.attractions?.trim() || null,
      directions: c.directions?.trim() || null,
      address: c.address?.trim() || null,
      lat: c.lat ?? null,
      lng: c.lng ?? null,
      checkintime: c.checkintime ?? null,
      checkouttime: c.checkouttime ?? null,
      wifi: c.wifi ?? null,
      wificost: c.wificost ?? null,
      parking: c.parking ?? null,
      allowPet: c.allowpet ?? null,
      allowSmoking: c.allowsmoking ?? false,
      grading: c.grading ?? [],
      propertyAmenities: c.propertyamenities ?? [],
      propertyImages: imgs.propertygallery ?? [],
      cancellationPolicy: c.cancellationpolicy?.description?.trim() || null,
      tripadvisorLocationId: c.tripadvisorextbbid ?? null,
      roomTypes,
    }

    _establishmentCache.set(bbid, { data, ts: Date.now() })
    console.log(`[NB establishment] ${bbid}: ${roomTypes.size} room types, ${data.propertyImages.length} property images`)
    return data
  } catch (err) {
    console.warn("[NB establishment] error:", err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Property-level policies (cancellation, child ages)
// ---------------------------------------------------------------------------

export type PropertyPolicies = {
  cancellationPolicy: string | null
  /** Age at which children stop staying free (exclusive upper bound of free tier). */
  childAgeFreeUpTo: number | null
  /** Age at which children pay the fixed rate. */
  childAgeFixedRate: number | null
  childFixedRate: number | null
  vatRegistered: boolean
  currencyCode: string
}

const _policyCache = new Map<string, { policies: PropertyPolicies; ts: number }>()

/**
 * Fetch property-level policies (cancellation, child ages) from the
 * /availability endpoint. This data sits at the root of the response,
 * not inside individual room types.
 */
export async function fetchPropertyPolicies(
  bbid: number,
  arrive: string,
  depart: string,
): Promise<PropertyPolicies | null> {
  const key = `policies::${bbid}::${arrive}::${depart}`
  const hit = _policyCache.get(key)
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.policies

  try {
    const res = await fetch(
      `https://www.nightsbridge.com/bridge/api/5.0/availability/${bbid}`,
      {
        method: "POST",
        headers: NB_HEADERS,
        body: JSON.stringify({
          bbid,
          startdate: arrive,
          enddate: depart,
          nightsbridge: true,
          bbrtid: 0,
          rtgroupid: 0,
          nbid: 0,
          promocode: "",
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      },
    )
    if (!res.ok) return null

    const json = (await res.json()) as {
      success: boolean
      data?: {
        vatregistered?: boolean
        currencycode?: string
        childpolicy?: {
          childage1?: number
          childage2?: number
        }
        cancellationpolicy?: {
          description?: string
          cancellationrules?: Array<{
            daysbefore: number
            amounttype: string
            amount: number
          }>
        }
        roomtypes?: Array<{
          childpolicy?: { childrate2?: number }
        }>
      }
    }

    if (!json.success || !json.data) return null

    const d = json.data
    // child fixed rate comes from first room type's per-room childpolicy
    const childFixedRate = d.roomtypes?.[0]?.childpolicy?.childrate2 ?? null

    const policies: PropertyPolicies = {
      cancellationPolicy: d.cancellationpolicy?.description?.trim() || null,
      childAgeFreeUpTo: d.childpolicy?.childage1 ?? null,
      childAgeFixedRate: d.childpolicy?.childage2 ?? null,
      childFixedRate,
      vatRegistered: d.vatregistered ?? false,
      currencyCode: d.currencycode ?? "ZAR",
    }

    _policyCache.set(key, { policies, ts: Date.now() })
    return policies
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Specials / promotions endpoint
// ---------------------------------------------------------------------------

export type NbSpecial = {
  specialid: number
  title: string
  description: string
  validfrom: string | null
  validto: string | null
  discount: number | null
  discounttype: string | null
  imageurl: string | null
}

const _specialsCache = new Map<number, { data: NbSpecial[]; ts: number }>()
const SPECIALS_TTL_MS = 30 * 60 * 1000 // 30 minutes

export async function fetchSpecials(bbid: number): Promise<NbSpecial[]> {
  const hit = _specialsCache.get(bbid)
  if (hit && Date.now() - hit.ts < SPECIALS_TTL_MS) return hit.data

  try {
    const res = await fetch(
      `https://www.nightsbridge.com/bridge/api/5.0/specials/${bbid}`,
      {
        method: "GET",
        headers: NB_HEADERS,
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      },
    )
    if (!res.ok) return []
    const json = (await res.json()) as {
      success?: boolean
      data?: unknown[]
    }
    const specials: NbSpecial[] = []
    if (json.success && Array.isArray(json.data)) {
      for (const s of json.data as Record<string, unknown>[]) {
        specials.push({
          specialid: Number(s.specialid ?? 0),
          title: String(s.title ?? s.name ?? ""),
          description: String(s.description ?? ""),
          validfrom: (s.validfrom as string) ?? null,
          validto: (s.validto as string) ?? null,
          discount: s.discount != null ? Number(s.discount) : null,
          discounttype: (s.discounttype as string) ?? null,
          imageurl: (s.imageurl as string) ?? null,
        })
      }
    }
    _specialsCache.set(bbid, { data: specials, ts: Date.now() })
    console.log(`[NB specials] ${specials.length} specials for ${bbid}`)
    return specials
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Occupancy overview — calls availgrid for every 7-day window in next N days
// ---------------------------------------------------------------------------

export type OccupancyDay = {
  date: string // YYYY-MM-DD
  available: number
  total: number
  rooms: Array<{ rtname: string; rtid: number; available: boolean; rateSingle: number | null }>
}

/**
 * Returns a daily occupancy map for the next `daysAhead` days.
 * Uses a single availgrid call to minimise API load.
 */
export async function fetchOccupancyCalendar(
  bbid: number,
  daysAhead = 30,
): Promise<OccupancyDay[]> {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const arrive = today.toISOString().slice(0, 10)

  const end = new Date(today)
  end.setDate(end.getDate() + daysAhead)
  const depart = end.toISOString().slice(0, 10)

  try {
    const res = await fetch("https://www.nightsbridge.com/bridge/api/5.0/availgrid", {
      method: "POST",
      headers: NB_HEADERS,
      body: JSON.stringify({
        bbid,
        nbid: 0,
        extbbid: "",
        clientloginkey: null,
        startdate: arrive,
        enddate: depart,
        bbrtid: 0,
        rtgroupid: 0,
        nightsbridge: true,
        showroomcount: false,
        showrates: true,
        showextras: false,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return []

    const json = (await res.json()) as {
      success?: boolean
      data?: {
        roomtypes?: Array<{
          rtid: number
          rtname: string
          availability: Array<{
            date: string
            noroomsfree: number
            rates?: Array<{ paxrate: number }>
          }>
        }>
      }
    }

    if (!json.success || !json.data?.roomtypes?.length) return []

    const roomTypes = json.data.roomtypes
    const dayMap = new Map<string, OccupancyDay>()

    // Build a date sequence for the full range
    const cursor = new Date(today)
    while (cursor < end) {
      const d = cursor.toISOString().slice(0, 10)
      dayMap.set(d, { date: d, available: 0, total: roomTypes.length, rooms: [] })
      cursor.setDate(cursor.getDate() + 1)
    }

    for (const rt of roomTypes) {
      for (const avail of rt.availability ?? []) {
        const day = dayMap.get(avail.date)
        if (!day) continue
        const isAvail = (avail.noroomsfree ?? 0) > 0
        if (isAvail) day.available++
        day.rooms.push({
          rtname: rt.rtname,
          rtid: rt.rtid,
          available: isAvail,
          rateSingle: avail.rates?.[0]?.paxrate ?? null,
        })
      }
    }

    return [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date))
  } catch (err) {
    console.warn("[NB occupancy] error:", err)
    return []
  }
}
