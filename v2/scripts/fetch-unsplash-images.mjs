/**
 * Fetches Unsplash images for all site slots via the Unsplash API.
 * Requires UNSPLASH_ACCESS_KEY in .env.local (see .env.example).
 *
 * Demo apps: 50 requests/hour — script uses one search per image (~39 total).
 * If rate-limited, progress is saved; re-run: pnpm run fetch-images
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { rooms } from '../data/rooms.ts'

const PROGRESS_PATH = new URL('./unsplash-progress.json', import.meta.url)
const DELAY_MS = 1500

function loadEnvLocal() {
  try {
    const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim()
      if (key && process.env[key] === undefined) process.env[key] = value
    }
  } catch {
    // optional
  }
}

loadEnvLocal()

const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY
if (!ACCESS_KEY) {
  console.error('Set UNSPLASH_ACCESS_KEY in .env.local or your environment')
  process.exit(1)
}

const usedIds = new Set()

function loadProgress() {
  if (!existsSync(PROGRESS_PATH)) return { site: {}, rooms: {} }
  return JSON.parse(readFileSync(PROGRESS_PATH, 'utf8'))
}

function saveProgress(progress) {
  writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2))
}

function photoSlug(photo) {
  for (const url of [photo.urls?.raw, photo.urls?.regular, photo.urls?.full]) {
    if (!url) continue
    const match = url.match(/\/(photo-[^/?]+)/)
    if (match) return match[1]
  }
  throw new Error(`Could not extract photo slug for Unsplash id ${photo.id}`)
}

async function apiSearch(params) {
  const maxRetries = 70
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
      headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
    })
    if (res.status === 403) {
      const remaining = res.headers.get('x-ratelimit-remaining')
      if (attempt < maxRetries - 1) {
        console.warn(
          `Rate limited (remaining: ${remaining ?? '0'}). Waiting 60s before retry ${attempt + 2}/${maxRetries}…`
        )
        await sleep(60_000)
        continue
      }
      throw new RateLimitError(
        'Unsplash hourly limit reached. Progress saved — run pnpm run fetch-images again later.'
      )
    }
    if (!res.ok) throw new Error(`Unsplash ${res.status}: ${await res.text()}`)
    return res.json()
  }
  throw new RateLimitError('Unsplash rate limit retries exhausted')
}

async function apiSearchWithNetworkRetry(params) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await apiSearch(params)
    } catch (e) {
      if (e instanceof RateLimitError) throw e
      if (attempt === 4) throw e
      console.warn(`Network error (${e.message}), retrying in 10s…`)
      await sleep(10_000)
    }
  }
}

class RateLimitError extends Error {
  name = 'RateLimitError'
}

async function searchPhoto(query, orientation = 'landscape') {
  const queryVariants = [
    query,
    query.split(/\s+/).slice(0, 5).join(' '),
    query.split(/\s+/).slice(0, 3).join(' '),
  ].filter((q, i, arr) => arr.indexOf(q) === i)

  for (const q of queryVariants) {
    const params = new URLSearchParams({
      query: q,
      per_page: '30',
      orientation,
    })
    const data = await apiSearchWithNetworkRetry(params)
    for (const photo of data.results || []) {
      if (!usedIds.has(photo.id)) {
        usedIds.add(photo.id)
        return {
          slug: photoSlug(photo),
          unsplashId: photo.id,
          alt: photo.alt_description || photo.description || query,
        }
      }
    }
  }
  throw new Error(`No unique photo for: ${query}`)
}

const slots = [
  {
    key: 'hero',
    query: 'african lodge guest house golden hour exterior warm',
    alt: 'Golden-hour exterior of a warm boutique African lodge guest house with rich amber light',
    orientation: 'landscape',
  },
  {
    key: 'property-chababa',
    query: 'south african guesthouse exterior warm',
    alt: 'Chababa guest house — charming South African villa exterior in warm daytime light',
  },
  {
    key: 'property-interlaken-a',
    query: 'residential guesthouse building green garden sunny',
    alt: 'Interlaken A — residential guest house with green garden in sunny setting',
  },
  {
    key: 'property-lantana',
    query: 'boutique accommodation exterior golden hour cosy',
    alt: 'Lantana — cosy boutique accommodation exterior at golden hour in the South African countryside',
  },
  {
    key: 'room-letimela',
    query: 'spacious family hotel room warm natural tones',
    alt: 'Letimela family room with spacious layout, warm tones and comfortable seating area',
    orientation: 'landscape',
  },
  {
    key: 'room-calabash',
    query: 'double bed hotel room warm lighting modern',
    alt: 'Calabash double room with warm lighting and modern, clean finishes',
    orientation: 'landscape',
  },
  {
    key: 'room-blue-clouds',
    query: 'twin bed hotel room light airy neutral',
    alt: 'Blue Clouds twin room with light, airy neutral décor and two beds',
    orientation: 'landscape',
  },
  {
    key: 'conference-hero',
    query: 'professional conference boardroom meeting',
    alt: 'Professional conference boardroom with seating and presentation setup',
    orientation: 'landscape',
  },
  {
    key: 'dining-restaurant',
    query: 'hotel breakfast dining area warm',
    alt: 'Warm hotel breakfast buffet with pastries and inviting morning spread',
    orientation: 'landscape',
  },
  {
    key: 'dining-private-events',
    query: 'private dining event elegant table',
    alt: 'Elegantly set dining table for private events and celebrations',
    orientation: 'landscape',
  },
  {
    key: 'dining-outdoor',
    query: 'outdoor restaurant garden seating evening',
    alt: 'Outdoor restaurant seating with warm evening lighting and inviting patio',
    orientation: 'landscape',
  },
  {
    key: 'dining-bar',
    query: 'hotel bar lounge warm interior',
    alt: 'Welcoming hotel bar and lounge with warm ambient lighting',
    orientation: 'landscape',
  },
]

const roomQueries = {
  Twin: [
    'twin bed hotel bedroom neutral bright',
    'twin room boutique hotel clean',
    'two single beds hotel room modern',
  ],
  Double: [
    'double bed hotel room warm',
    'queen bed boutique hotel bedroom',
    'hotel double room cozy lighting',
  ],
  Family: [
    'family hotel suite spacious warm',
    'large family guest room hotel',
    'family accommodation hotel room',
  ],
  Triple: ['triple room hotel three beds', 'spacious hotel room multiple beds'],
  TBC: [
    'boutique hotel bedroom warm tones',
    'guest house room interior',
    'hotel room comfortable neutral',
  ],
}

const roomQueryIndex = { Twin: 0, Double: 0, Family: 0, Triple: 0, TBC: 0 }

const featuredRoomSiteKeys = {
  letimela: 'room-letimela',
  calabash: 'room-calabash',
  'blue-clouds': 'room-blue-clouds',
}

async function roomQuery(room) {
  const pool = roomQueries[room.configuration] || roomQueries.TBC
  const idx = roomQueryIndex[room.configuration]++ % pool.length
  const base = pool[idx]
  return `${base} ${room.property === 'lantana' ? 'boutique' : 'guest house'}`
}

function writeImagesTs(site, roomMap) {
  const lines = [
    '/* Auto-generated by scripts/fetch-unsplash-images.mjs — re-run: pnpm run fetch-images */',
    '',
    "import { unsplashUrl } from '@/lib/unsplash'",
    '',
    'export type SiteImageData = { src: string; alt: string }',
    '',
    'export const siteImages = {',
    '  site: {',
  ]
  for (const [k, v] of Object.entries(site)) {
    lines.push(`    '${k}': { src: unsplashUrl('${v.slug}'), alt: ${JSON.stringify(v.alt)} },`)
  }
  lines.push('  },', '  rooms: {')
  for (const [k, v] of Object.entries(roomMap)) {
    lines.push(`    '${k}': { src: unsplashUrl('${v.slug}'), alt: ${JSON.stringify(v.alt)} },`)
  }
  lines.push('  },', '} as const', '')
  lines.push('export function getSiteImage(key: keyof typeof siteImages.site): SiteImageData {')
  lines.push('  return siteImages.site[key]')
  lines.push('}', '')
  lines.push('export function getRoomImage(roomName: string): SiteImageData {')
  lines.push("  const key = roomName.toLowerCase().replace(/\\s+/g, '-')")
  lines.push('  return siteImages.rooms[key as keyof typeof siteImages.rooms]')
  lines.push('}')
  writeFileSync(new URL('../data/images.ts', import.meta.url), lines.join('\n'))
}

function hydrateUsedIds(progress) {
  for (const entry of [...Object.values(progress.site), ...Object.values(progress.rooms)]) {
    if (entry.unsplashId) usedIds.add(entry.unsplashId)
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const progress = loadProgress()
  hydrateUsedIds(progress)

  const site = { ...progress.site }
  const roomMap = { ...progress.rooms }

  try {
    for (const slot of slots) {
      if (site[slot.key]) {
        console.log(`Skip site (cached): ${slot.key}`)
        continue
      }
      console.log(`Fetching site: ${slot.key}`)
      const photo = await searchPhoto(slot.query, slot.orientation || 'landscape')
      site[slot.key] = { slug: photo.slug, alt: slot.alt, unsplashId: photo.unsplashId }
      saveProgress({ site, rooms: roomMap })
      await sleep(DELAY_MS)
    }

    for (const room of rooms) {
      const key = room.name.toLowerCase().replace(/\s+/g, '-')
      if (roomMap[key]) {
        console.log(`Skip room (cached): ${room.name}`)
        continue
      }

      const siteKey = featuredRoomSiteKeys[key]
      if (siteKey && site[siteKey]) {
        console.log(`Room ${room.name}: reusing ${siteKey}`)
        roomMap[key] = {
          slug: site[siteKey].slug,
          alt: `${room.name} room at Boga Legaba — ${room.configuration} accommodation in Mahikeng`,
        }
        saveProgress({ site, rooms: roomMap })
        continue
      }

      console.log(`Fetching room: ${room.name}`)
      const q = await roomQuery(room)
      const photo = await searchPhoto(q, 'landscape')
      roomMap[key] = {
        slug: photo.slug,
        alt: `${room.name} room at Boga Legaba — ${room.configuration} accommodation in Mahikeng`,
        unsplashId: photo.unsplashId,
      }
      saveProgress({ site, rooms: roomMap })
      await sleep(DELAY_MS)
    }

    writeImagesTs(site, roomMap)
    saveProgress({ site, rooms: roomMap, completedAt: new Date().toISOString() })
    console.log(
      `Wrote data/images.ts (${Object.keys(site).length} site + ${Object.keys(roomMap).length} room images)`
    )
  } catch (e) {
    saveProgress({ site, rooms: roomMap })
    if (e instanceof RateLimitError) {
      const done = Object.keys(site).length + Object.keys(roomMap).length
      console.error(e.message)
      console.error(`Progress saved (${done} items). Re-run: pnpm run fetch-images`)
      process.exit(2)
    }
    throw e
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
