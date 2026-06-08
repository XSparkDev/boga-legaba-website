/**
 * Fetches Unsplash photos for all site image slots.
 * Saves progress to data/site-images.json and generates data/site-images.ts
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, "..")
const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || "QhGIJFUqBbG2KR1iyo48GpmdqsEMkO2xE2oNDeLBG6s"
const JSON_PATH = path.join(ROOT, "data", "site-images.json")
const TS_PATH = path.join(ROOT, "data", "site-images.ts")

const ROOM_QUERIES = {
  Double: "luxury hotel double bedroom ensuite",
  Twin: "hotel twin room two beds modern",
  Family: "hotel family room spacious bedroom",
  Triple: "hotel triple room three beds",
  TBC: "boutique hotel bedroom corporate",
}

const SLOTS = [
  { key: "hero", query: "luxury guest house exterior evening africa warm lighting" },
  { key: "property.chababa", query: "boutique guesthouse building exterior africa" },
  { key: "property.interlaken-a", query: "residential lodge exterior south africa" },
  { key: "property.lantana", query: "conference hotel building exterior modern" },
  { key: "conference", query: "conference room meeting theatre setup professional" },
  { key: "dining", query: "hotel restaurant dining room elegant" },
  { key: "specials.extended-stay", query: "hotel bedroom extended stay comfortable" },
  { key: "specials.conference-accommodation", query: "conference hotel accommodation delegates" },
  { key: "specials.government-rate", query: "business hotel room professional clean" },
  { key: "gallery.chababa-reeds", query: "hotel bedroom double interior" },
  { key: "gallery.chababa-blue-clouds", query: "hotel twin room ensuite bright" },
  { key: "gallery.chababa-lounge", query: "guesthouse lounge sitting area warm" },
  { key: "gallery.interlaken-calabash", query: "hotel bedroom double bed" },
  { key: "gallery.interlaken-exterior", query: "guest house garden exterior pathway" },
  { key: "gallery.interlaken-segametsi", query: "hotel family room bedroom" },
  { key: "gallery.lantana-suite", query: "executive hotel suite bedroom" },
  { key: "gallery.lantana-garden", query: "hotel garden courtyard landscaping" },
  { key: "gallery.conference-theatre", query: "conference auditorium theatre seating" },
  { key: "gallery.conference-boardroom", query: "boardroom meeting table corporate" },
  { key: "gallery.dining-restaurant", query: "restaurant dining tables hotel" },
  { key: "gallery.dining-bar", query: "hotel bar lounge interior" },
  { key: "attractions.map", query: "south africa savanna landscape aerial" },
]

// Room slots from property data
const PROPERTIES = [
  {
    id: "chababa",
    rooms: [
      "Beads",
      "Blue Clouds",
      "Flutes",
      "Hunters",
      "Huts",
      "Letimela",
      "Modjadji",
      "Queens",
      "Reeds",
      "Spears",
    ],
    roomConfigs: {
      Beads: "Double",
      "Blue Clouds": "Twin",
      Flutes: "Twin",
      Hunters: "Double",
      Huts: "Double",
      Letimela: "Family",
      Modjadji: "Double",
      Queens: "Double",
      Reeds: "Double",
      Spears: "Twin",
    },
  },
  {
    id: "interlaken-a",
    rooms: ["A Mulher Africana", "Blue Sea", "Red Room", "Calabash", "Segametsi", "Squater Comfort"],
    roomConfigs: {
      "A Mulher Africana": "Family",
      "Blue Sea": "Twin",
      "Red Room": "Double",
      Calabash: "Double",
      Segametsi: "Family",
      "Squater Comfort": "Triple",
    },
  },
  {
    id: "lantana",
    rooms: ["Modiga", "Mojamorago", "Mophato", "Motswakgomo", "Lantana Room 5", "Lantana Room 6", "Lantana Room 7"],
    roomConfigs: {},
  },
  {
    id: "transnet",
    rooms: ["Lokomotief", "Mjantshi", "Shosholoza", "Stimela"],
    roomConfigs: {},
  },
]

for (const prop of PROPERTIES) {
  for (const room of prop.rooms) {
    const config = prop.roomConfigs[room] || "TBC"
    const base = ROOM_QUERIES[config] || ROOM_QUERIES.TBC
    const slug = room.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    let page = 1
    for (const ch of slug) page = (page + ch.charCodeAt(0)) % 12
    page += 1
    SLOTS.push({
      key: `room.${prop.id}.${slug}`,
      query: base,
      page,
    })
  }
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function loadProgress() {
  if (fs.existsSync(JSON_PATH)) {
    return JSON.parse(fs.readFileSync(JSON_PATH, "utf8"))
  }
  return { images: {}, fetchedAt: null }
}

function saveProgress(data) {
  fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true })
  fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2))
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

const LANDSCAPE_KEYS = new Set([
  "hero",
  "property.chababa",
  "property.interlaken-a",
  "property.lantana",
  "conference",
  "dining",
  "attractions.map",
  "gallery.interlaken-exterior",
  "gallery.lantana-garden",
  "gallery.conference-theatre",
  "gallery.conference-boardroom",
  "gallery.dining-restaurant",
])

async function searchOnce(query, page, landscape) {
  const url = new URL("https://api.unsplash.com/search/photos")
  url.searchParams.set("query", query)
  url.searchParams.set("per_page", "1")
  url.searchParams.set("page", String(page))
  if (landscape) url.searchParams.set("orientation", "landscape")

  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
  })

  const bodyText = !res.ok ? await res.text() : ""

  if (res.status === 429 || (res.status === 403 && bodyText.includes("Rate Limit"))) {
    const err = new Error(`Rate limited (${res.status})`)
    err.rateLimited = true
    throw err
  }

  if (!res.ok) {
    throw new Error(`Unsplash API ${res.status}: ${bodyText.slice(0, 200)}`)
  }

  const data = JSON.parse(bodyText || await res.text())
  return data.results?.[0] ?? null
}

async function fetchPhoto(query, page = 1, key = "") {
  const landscape = LANDSCAPE_KEYS.has(key)
  const attempts = [
    { q: query, p: page, l: landscape },
    { q: query, p: page, l: false },
    { q: query.split(" ").slice(0, 4).join(" "), p: page + 1, l: false },
    { q: "hotel bedroom interior", p: (page % 10) + 1, l: false },
    { q: "luxury hotel room", p: (page % 12) + 1, l: false },
  ]

  for (const { q, p, l } of attempts) {
    const photo = await searchOnce(q, p, l)
    if (photo) {
      return {
        url: photo.urls.regular,
        alt: photo.alt_description || photo.description || query,
        photographer: photo.user?.name,
        unsplashId: photo.id,
      }
    }
  }

  throw new Error(`No results for query: ${query}`)
}

function generateTs(images) {
  const lines = [
    "// Auto-generated Unsplash image URLs — do not edit by hand",
    "// Regenerate: node scripts/fetch-unsplash-images.mjs",
    "",
    "export type SiteImage = {",
    "  url: string",
    "  alt: string",
    "}",
    "",
    "export const siteImages = {",
  ]

  for (const [key, img] of Object.entries(images).sort(([a], [b]) => a.localeCompare(b))) {
    const safeKey = key.includes(".") || key.includes("-") ? `"${key}"` : key
    const alt = img.alt.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ")
    lines.push(`  ${safeKey}: {`)
    lines.push(`    url: "${img.url}",`)
    lines.push(`    alt: "${alt}",`)
    lines.push(`  },`)
  }

  lines.push("} as const")
  lines.push("")
  lines.push("export type SiteImageKey = keyof typeof siteImages")
  lines.push("")
  lines.push("export function getSiteImage(key: SiteImageKey): SiteImage {")
  lines.push("  return siteImages[key]")
  lines.push("}")
  lines.push("")
  lines.push("/** Room image key: room.{propertyId}.{room-slug} */")
  lines.push("export function getRoomImageKey(propertyId: string, roomName: string): SiteImageKey {")
  lines.push('  const slug = roomName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")')
  lines.push('  return `room.${propertyId}.${slug}` as SiteImageKey')
  lines.push("}")
  lines.push("")

  fs.writeFileSync(TS_PATH, lines.join("\n"))
}

async function waitForQuota() {
  while (true) {
    const res = await fetch("https://api.unsplash.com/search/photos?query=hotel&per_page=1", {
      headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
    })
    const remaining = parseInt(res.headers.get("x-ratelimit-remaining") ?? "0", 10)
    if (remaining > 2) return
    console.log(`Quota low (${remaining}/50), waiting 3 minutes...`)
    await sleep(180000)
  }
}

async function main() {
  const progress = loadProgress()
  const pending = SLOTS.filter((s) => !progress.images[s.key])

  if (pending.length > 0) await waitForQuota()

  console.log(`Total slots: ${SLOTS.length}, already fetched: ${SLOTS.length - pending.length}, pending: ${pending.length}`)

  let index = 0
  for (const slot of pending) {
    index++
    const page = slot.page || (index % 8) + 1
    process.stdout.write(`[${index}/${pending.length}] ${slot.key}... `)

    let retries = 0
    while (retries < 5) {
      try {
        const img = await fetchPhoto(slot.query, page, slot.key)
        progress.images[slot.key] = img
        progress.fetchedAt = new Date().toISOString()
        saveProgress(progress)
        console.log("ok")
        await sleep(600)
        break
      } catch (e) {
        if (e.rateLimited) {
          retries++
          const waitSec = 30 * retries
          console.log(`rate limited, waiting ${waitSec}s...`)
          await sleep(waitSec * 1000)
        } else {
          console.log(`error: ${e.message}, retrying...`)
          retries++
          await sleep(3000)
        }
      }
    }
  }

  generateTs(progress.images)
  console.log(`\nDone. ${Object.keys(progress.images).length} images in ${TS_PATH}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
