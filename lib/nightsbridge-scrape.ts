/**
 * Scrape live room-type rates from the NightsBridge public booking widget.
 *
 * book.nightsbridge.com/{bbid}?arrive=...&depart=... may be server-rendered
 * (Angular Universal / SSR) or client-rendered (CSR shell only).
 * Use debug=1 on the API route first to inspect what fetch() actually returns.
 *
 * Extraction strategies (tried in order):
 *  A. Inline-script JSON scan — any <script> tag with room/price keywords
 *  B. <table> rates grid     — rows with room name + price/SOLD cells
 *  C. "From R" card anchors  — text pattern near price declarations
 *
 * Availability overlay:
 *  After prices are extracted, calendar.nightsbridge.com is queried for
 *  definitive availability (all nights must be free for a room to be shown
 *  as available). Falls back to scrape-based availability if calendar fails.
 *
 * Results are upserted into Supabase rate_cache (service role key required).
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export type ScrapedRoom = {
  rtname: string
  rateSingle: number | null
  rateDouble: number | null
  available: boolean
  description: string | null
  maxGuests: number | null
  maxAdults: number | null
  childrenPolicy: string | null
  imageUrl: string | null
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-ZA,en;q=0.9",
  "Cache-Control": "no-cache",
}

async function fetchUrl(
  url: string,
  timeoutMs = 15_000,
): Promise<{ ok: boolean; contentType: string; text: string }> {
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(timeoutMs),
    })
    const text = await res.text()
    return {
      ok: res.ok,
      contentType: res.headers.get("content-type") ?? "",
      text,
    }
  } catch {
    return { ok: false, contentType: "", text: "" }
  }
}

// ---------------------------------------------------------------------------
// Text utilities
// ---------------------------------------------------------------------------

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

function stripTags(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function clean(html: string): string {
  return decodeEntities(stripTags(html))
}

/** Extract ZAR price amounts from text. Returns sorted ascending, unique. */
function extractPrices(text: string): number[] {
  const prices: number[] = []
  const re = /R\s*([\d,]+(?:\.\d{2})?)/gi
  let m
  while ((m = re.exec(text)) !== null) {
    const v = parseFloat(m[1].replace(/,/g, ""))
    if (v >= 50 && v <= 100_000) prices.push(v)
  }
  return [...new Set(prices)].sort((a, b) => a - b)
}

// ---------------------------------------------------------------------------
// Strategy A: inline-script JSON scanning
//
// Scans every <script> tag without a src attribute.
// If the script contains room/price keywords we try to extract JSON from it.
// ---------------------------------------------------------------------------

/**
 * Recursively search a parsed JSON value for an array that looks like
 * a list of NightsBridge room types.
 */
function roomsFromJson(obj: unknown, depth = 0): ScrapedRoom[] | null {
  if (depth > 10 || obj == null || typeof obj !== "object") return null

  if (Array.isArray(obj) && obj.length > 0) {
    const first = obj[0] as Record<string, unknown>
    if (typeof first === "object" && first !== null) {
      const keys = Object.keys(first).map((k) => k.toLowerCase())
      const hasRoomKey =
        keys.some((k) => k.includes("rtname") || k.includes("roomtype") || k === "name") &&
        keys.some(
          (k) =>
            k.includes("rate") ||
            k.includes("price") ||
            k.includes("sold") ||
            k.includes("available"),
        )

      if (hasRoomKey) {
        return (obj as Record<string, unknown>[]).flatMap((item) => {
          const r = item as Record<string, unknown>
          // Normalise common key names (NightsBridge uses varied casing)
          const get = (...keys: string[]): unknown =>
            keys.reduce<unknown>((acc, k) => {
              if (acc != null) return acc
              const lk = k.toLowerCase()
              const found = Object.keys(r).find((rk) => rk.toLowerCase() === lk)
              return found ? r[found] : null
            }, null)

          const name = String(get("rtname", "roomtypename", "roomtype", "name") ?? "")
          if (!name) return []

          const rateSingle = get("ratesingle", "rate_single", "rate1adult", "single_rate")
          const rateDouble = get(
            "ratedouble",
            "rate_double",
            "rate2adults",
            "double_rate",
            "fromPrice",
            "from_price",
          )
          const sold = get("issold", "sold", "is_sold")
          const available = get("available", "isavailable", "is_available")

          return [
            {
              rtname: name,
              rateSingle: rateSingle != null ? Number(rateSingle) : null,
              rateDouble: rateDouble != null ? Number(rateDouble) : null,
              available: sold === true ? false : available !== false,
              description: String(get("rtdesc", "description", "desc") ?? "") || null,
              maxGuests:
                get("maxoccupancy", "max_occupancy", "maxguests", "max_guests") != null
                  ? Number(get("maxoccupancy", "max_occupancy", "maxguests", "max_guests"))
                  : null,
              maxAdults:
                get("maxadults", "max_adults") != null
                  ? Number(get("maxadults", "max_adults"))
                  : null,
              childrenPolicy:
                String(get("childrenpolicy", "children_policy", "childpolicy") ?? "") || null,
              imageUrl: String(get("imageurl", "image_url", "image", "photo") ?? "") || null,
            } satisfies ScrapedRoom,
          ]
        })
      }
    }
  }

  // Recurse
  for (const key of Object.keys(obj as object)) {
    const result = roomsFromJson((obj as Record<string, unknown>)[key], depth + 1)
    if (result?.length) return result
  }
  return null
}

/**
 * Try to extract rooms from a single inline script string.
 * Returns null if the script doesn't appear to contain room pricing data.
 */
function parseScript(script: string): ScrapedRoom[] | null {
  // Quick filter: skip scripts without price/room keywords
  if (
    !/(?:rtname|roomtype|room_type|rateDouble|RateDouble|ratedouble|rateSingle|RateSingle|ratesingle|fromPrice|from_price|pernight|per_night|issold|is_sold)/i.test(
      script,
    )
  ) {
    return null
  }

  // Patterns to extract JSON sub-expressions from script content
  const extractors = [
    // window.X = {...} or window.X = [...]
    /window\s*\.\s*\w+\s*=\s*([{\[][\s\S]{30,}?[}\]])\s*;/g,
    // var/let/const X = {...} or [...]
    /(?:var|let|const)\s+\w+\s*=\s*([{\[][\s\S]{30,}?[}\]])\s*;/g,
    // assignment without keyword: X = {...}
    /\w+\s*=\s*(\[[\s\S]{30,}?\])\s*;/g,
  ]

  for (const re of extractors) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(script)) !== null) {
      try {
        const data: unknown = JSON.parse(m[1])
        const rooms = roomsFromJson(data)
        if (rooms?.length) return rooms
      } catch {
        // Not valid JSON — try next match
      }
    }
  }

  // Try entire script as JSON (e.g. <script type="application/json">)
  try {
    const data: unknown = JSON.parse(script.trim())
    const rooms = roomsFromJson(data)
    if (rooms?.length) return rooms
  } catch {}

  return null
}

function extractInlineScriptRooms(html: string): ScrapedRoom[] | null {
  // Match inline <script> tags (no src= attribute)
  const scriptRe = /<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi
  let m
  while ((m = scriptRe.exec(html)) !== null) {
    const content = m[1].trim()
    if (content.length < 50) continue
    const rooms = parseScript(content)
    if (rooms?.length) return rooms
  }
  return null
}

// ---------------------------------------------------------------------------
// Strategy B: <table> rates grid
//
// NightsBridge shows a rates table: rows = room types, columns = dates.
// Each date cell has [singleRate, doubleRate] or "SOLD".
// ---------------------------------------------------------------------------

function parseRatesGrid(
  html: string,
): Map<string, { rateSingle: number | null; rateDouble: number | null; available: boolean }> {
  const result = new Map<
    string,
    { rateSingle: number | null; rateDouble: number | null; available: boolean }
  >()

  // Extract <tr> blocks
  const trRe = /<tr(?:\s[^>]*)?>(\s*[\s\S]*?)<\/tr>/gi
  let trM
  while ((trM = trRe.exec(html)) !== null) {
    const cells: string[] = []
    const tdRe = /<t[dh](?:\s[^>]*)?>(\s*[\s\S]*?)<\/t[dh]>/gi
    let tdM
    while ((tdM = tdRe.exec(trM[1])) !== null) {
      cells.push(clean(tdM[1]))
    }
    if (cells.length < 2) continue

    const nameCell = cells[0].trim()
    // Room type name: text-only, sensible length, no price pattern
    if (
      !nameCell ||
      nameCell.length < 3 ||
      nameCell.length > 120 ||
      /R\s*[\d,]/.test(nameCell)
    ) {
      continue
    }

    const rateCells = cells.slice(1)
    const allSold = rateCells.length > 0 && rateCells.every((c) => /\bSOLD\b/i.test(c))

    if (allSold) {
      result.set(nameCell, { rateSingle: null, rateDouble: null, available: false })
      continue
    }

    // Use the first date cell that has prices
    const priceCell = rateCells.find((c) => /R\s*[\d,]/.test(c))
    if (!priceCell) continue

    const prices = extractPrices(priceCell)
    if (!prices.length) continue

    result.set(nameCell, {
      rateSingle: prices[0] ?? null,
      rateDouble: prices.length > 1 ? prices[1] : prices[0],
      available: true,
    })
  }

  return result
}

// ---------------------------------------------------------------------------
// Strategy C: "From R{X} Per night for {N} adults" card anchors
// ---------------------------------------------------------------------------

// Common NightsBridge room type name patterns
const ROOM_NAME_RES = [
  /((?:Twin|Double|Family|Triple|Single|Queen|King|Standard|Deluxe|Superior|Executive|Luxury|Budget|Junior|Studio|En[-\s]?suite)\s+(?:Room|Suite|Cottage|Lodge|Bedroom|Chalet|Studio)(?:\s*\([^)]{3,40}\))?)/gi,
  /((?:Twin|Double|Family|Triple|Single|Queen|King)\s*\([^)]{3,40}\))/gi,
]

function findRtname(text: string): string | null {
  for (const re of ROOM_NAME_RES) {
    re.lastIndex = 0
    const all = [...text.matchAll(re)]
    if (all.length) return decodeEntities(all[all.length - 1][1].trim())
  }

  // Generic: last short Sentence-Case phrase before the anchor
  const segs = text.split(/[\n.!?|\/]/)
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i].trim()
    if (
      s.length >= 5 &&
      s.length <= 80 &&
      /^[A-Z]/.test(s) &&
      !/R\s*[\d,]/.test(s) &&
      !/^(?:from|book|view|photo|gallery|available|check|select|show|hide|back|next|prev|loading|please|this|that|there|we|our|your)/i.test(
        s,
      )
    ) {
      return s
    }
  }
  return null
}

function extractMaxGuests(text: string): number | null {
  for (const re of [
    /max(?:imum)?\s*(?:guests?|occupancy|persons?|pax)\s*:?\s*(\d+)/i,
    /sleeps?\s*(?:a?\s*max(?:imum)?\s*of\s*)?(\d+)/i,
    /(?:maximum|max)\s*(\d+)\s*(?:guests?|persons?|pax)/i,
    /(\d+)\s*(?:guests?|persons?|pax)\s*(?:max(?:imum)?|only)/i,
  ]) {
    const m = text.match(re)
    if (m) return parseInt(m[1])
  }
  return null
}

function extractChildrenPolicy(text: string): string | null {
  for (const re of [
    /(\d+\s*[-–]\s*\d+\s*years?\s+stay\s+free[^.!?|\n]{0,150})/i,
    /(children\s+(?:under\s+\d+\s+)?(?:stay\s+free|pay[^.!?|\n]{0,80}))/i,
    /(\d+\s*[-–]\s*\d+\s*years?[^.!?|\n]{0,100}(?:free|R\s*\d+))/i,
  ]) {
    const m = text.match(re)
    if (m) return m[1].trim().replace(/\s+/g, " ")
  }
  return null
}

function extractDescription(context: string, rtname: string): string | null {
  const idx = context.toLowerCase().lastIndexOf(rtname.toLowerCase())
  if (idx === -1) return null
  const after = context.slice(idx + rtname.length).trim()
  const stop = after.search(
    /\b(?:\d+\s*[-–]\s*\d+\s*years?|max(?:imum)?|children|from\s+R|sleeps?|Book\s+Now|view\s+photo)/i,
  )
  const desc = (stop > 0 ? after.slice(0, stop) : after).replace(/\s+/g, " ").trim()
  return desc.length > 10 ? desc : null
}

function parseCardAnchors(html: string): ScrapedRoom[] {
  const text = clean(html)
  const rooms = new Map<string, ScrapedRoom>()

  const ANCHOR = /from\s+R\s*([\d,]+(?:\.\d{2})?)\s*per\s*night\s*for\s*(\d+)\s*adults?/gi
  let m
  while ((m = ANCHOR.exec(text)) !== null) {
    const price = parseFloat(m[1].replace(/,/g, ""))
    const adults = parseInt(m[2])
    if (!price || !adults) continue

    const ctxStart = Math.max(0, m.index - 800)
    const ctx = text.slice(ctxStart, m.index)

    const rtname = findRtname(ctx)
    if (!rtname) continue

    const key = rtname.toLowerCase()
    const ex = rooms.get(key) ?? {
      rtname,
      rateSingle: null,
      rateDouble: null,
      available: !/\bSOLD\b/i.test(ctx),
      description: extractDescription(ctx, rtname),
      maxGuests: extractMaxGuests(ctx),
      maxAdults: null,
      childrenPolicy: extractChildrenPolicy(ctx),
      imageUrl: null,
    }

    if (adults >= 2) ex.rateDouble = price
    else ex.rateSingle = price
    if (ex.maxAdults == null || adults > ex.maxAdults) ex.maxAdults = adults

    rooms.set(key, ex)
  }

  return [...rooms.values()]
}

// ---------------------------------------------------------------------------
// Image extraction
// ---------------------------------------------------------------------------

function extractImages(html: string): Map<string, string> {
  const map = new Map<string, string>()
  const IMG_RE = /<img[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*>/gi
  let m
  while ((m = IMG_RE.exec(html)) !== null) {
    const src = m[1]
    if (/logo|icon|sprite|avatar|placeholder|spinner/i.test(src)) continue
    if (/\.(svg|gif)$/i.test(src)) continue
    const ctxStart = Math.max(0, m.index - 150)
    const ctx = clean(html.slice(ctxStart, Math.min(html.length, m.index + 600)))
    for (const re of ROOM_NAME_RES) {
      re.lastIndex = 0
      const nm = ctx.match(re)
      if (nm) {
        const key = nm[1].trim().toLowerCase()
        if (!map.has(key)) map.set(key, src)
        break
      }
    }
  }
  return map
}

// ---------------------------------------------------------------------------
// calendar.nightsbridge.com — availability overlay
//
// Tries multiple endpoint patterns. We don't know the definitive format
// so we attempt JSON and HTML and parse generically.
// ---------------------------------------------------------------------------

function parseAvailJson(data: unknown): Map<string, boolean> | null {
  const result = new Map<string, boolean>()

  function walk(obj: unknown, d = 0): void {
    if (d > 8 || obj == null || typeof obj !== "object") return
    if (Array.isArray(obj)) {
      for (const item of obj as Record<string, unknown>[]) {
        if (typeof item !== "object") continue
        const r = item as Record<string, unknown>
        // Look for {name/rtname, available/sold} shape
        const name = r.rtname ?? r.roomtypename ?? r.name ?? r.RoomTypeName
        const sold = r.issold ?? r.sold ?? r.IsSold
        const avail = r.available ?? r.isavailable ?? r.IsAvailable
        if (name) {
          const isAvail = sold === true ? false : avail !== false
          result.set(String(name), isAvail)
        }
        walk(item, d + 1)
      }
    } else {
      for (const v of Object.values(obj as object)) walk(v, d + 1)
    }
  }

  walk(data)
  return result.size > 0 ? result : null
}

async function fetchCalendarAvailability(
  bbid: number,
  arrive: string,
  depart: string,
): Promise<Map<string, boolean> | null> {
  const endpoints = [
    `https://calendar.nightsbridge.com/api/availability?bbid=${bbid}&arrive=${arrive}&depart=${depart}`,
    `https://calendar.nightsbridge.com/api/rooms?bbid=${bbid}&arrive=${arrive}&depart=${depart}`,
    `https://calendar.nightsbridge.com/availability?bbid=${bbid}&arrive=${arrive}&depart=${depart}`,
    // Some NightsBridge installs expose availability on the booking subdomain
    `https://book.nightsbridge.com/api/availability?bbid=${bbid}&arrive=${arrive}&depart=${depart}`,
    `https://book.nightsbridge.com/${bbid}/availability.json?arrive=${arrive}&depart=${depart}`,
  ]

  for (const url of endpoints) {
    const { ok, contentType, text } = await fetchUrl(url, 6_000)
    if (!ok || !text) continue

    // Try JSON
    if (contentType.includes("json") || text.trim().startsWith("{") || text.trim().startsWith("[")) {
      try {
        const data: unknown = JSON.parse(text)
        const avail = parseAvailJson(data)
        if (avail?.size) {
          console.log(`[NightsBridge] Calendar availability from: ${url}`)
          return avail
        }
      } catch {}
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Merge results from all strategies
// ---------------------------------------------------------------------------

function merge(
  grid: Map<string, { rateSingle: number | null; rateDouble: number | null; available: boolean }>,
  cards: ScrapedRoom[],
  images: Map<string, string>,
): ScrapedRoom[] {
  const byKey = new Map<string, ScrapedRoom>()

  for (const card of cards) {
    byKey.set(card.rtname.toLowerCase(), { ...card })
  }

  for (const [name, rates] of grid) {
    const key = name.toLowerCase()
    const ex = byKey.get(key)
    if (ex) {
      if (rates.rateSingle != null) ex.rateSingle = rates.rateSingle
      if (rates.rateDouble != null) ex.rateDouble = rates.rateDouble
      if (!rates.available) ex.available = false
    } else {
      byKey.set(key, {
        rtname: name,
        rateSingle: rates.rateSingle,
        rateDouble: rates.rateDouble,
        available: rates.available,
        description: null,
        maxGuests: null,
        maxAdults: null,
        childrenPolicy: null,
        imageUrl: null,
      })
    }
  }

  for (const [key, url] of images) {
    const room = byKey.get(key)
    if (room && !room.imageUrl) room.imageUrl = url
  }

  return [...byKey.values()].filter((r) => r.rtname.trim().length > 0)
}

// ---------------------------------------------------------------------------
// Upsert to rate_cache
// ---------------------------------------------------------------------------

async function saveToRateCache(
  rooms: ScrapedRoom[],
  bbid: number,
  arrive: string,
  depart: string,
): Promise<void> {
  if (!rooms.length) return
  try {
    const admin = createSupabaseAdminClient()
    const rows = rooms.map((r) => ({
      bbid,
      rtname: r.rtname,
      rate_single: r.rateSingle,
      rate_double: r.rateDouble,
      available: r.available,
      arrive,
      depart,
      scraped_at: new Date().toISOString(),
    }))
    await admin.from("rate_cache").upsert(rows, { onConflict: "bbid,rtname,arrive,depart" })
  } catch {
    // Non-fatal
  }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Fetch, parse, and cache live NightsBridge room rates.
 *
 * Returns null if the booking page couldn't be fetched or contained no
 * parseable room data (e.g. if it's a CSR-only Angular shell).
 * Use /api/nightsbridge/rates?debug=1 to inspect what the page actually returns.
 */
export async function scrapeNightsBridgeHtml(
  bbid: number,
  arrive: string,
  depart: string,
): Promise<ScrapedRoom[] | null> {
  const url = `https://book.nightsbridge.com/${bbid}?arrive=${arrive}&depart=${depart}`
  const { ok, text: html } = await fetchUrl(url, 15_000)

  if (!ok || html.length < 3_000) {
    console.log(
      `[NightsBridge Scrape] Page too short or failed (${html.length} chars) — page may be CSR-only. Use debug=1 to inspect.`,
    )
    return null
  }

  // ── Strategy A: inline scripts ──────────────────────────────────────────
  const fromScripts = extractInlineScriptRooms(html)
  if (fromScripts?.length) {
    console.log(`[NightsBridge Scrape] Got ${fromScripts.length} rooms from inline scripts`)
    const rooms = await overlayCalendarAvailability(fromScripts, bbid, arrive, depart)
    await saveToRateCache(rooms, bbid, arrive, depart)
    return rooms
  }

  // ── Strategy B + C: HTML structure parsing ──────────────────────────────
  const grid = parseRatesGrid(html)
  const cards = parseCardAnchors(html)
  const images = extractImages(html)
  const merged = merge(grid, cards, images)

  if (merged.length > 0) {
    console.log(
      `[NightsBridge Scrape] Got ${merged.length} rooms (grid=${grid.size} cards=${cards.length})`,
    )
    const rooms = await overlayCalendarAvailability(merged, bbid, arrive, depart)
    await saveToRateCache(rooms, bbid, arrive, depart)
    return rooms
  }

  console.log(
    `[NightsBridge Scrape] No rooms found in HTML (${html.length} chars). ` +
      `HTML may be a CSR shell. Use /api/nightsbridge/rates?arrive=...&depart=...&debug=1 to inspect.`,
  )
  return null
}

/** Overlay definitive availability from the calendar API on scraped rooms. */
async function overlayCalendarAvailability(
  rooms: ScrapedRoom[],
  bbid: number,
  arrive: string,
  depart: string,
): Promise<ScrapedRoom[]> {
  const calendarAvail = await fetchCalendarAvailability(bbid, arrive, depart)
  if (!calendarAvail?.size) return rooms

  return rooms.map((room) => {
    const calAvail = calendarAvail.get(room.rtname)
    if (calAvail === undefined) return room
    // Calendar is the source of truth — if it says SOLD, it's SOLD
    return { ...room, available: calAvail }
  })
}
