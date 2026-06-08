import { writeFileSync } from 'fs'
import { rooms } from '../data/rooms.ts'
import { unsplashUrl } from '../lib/unsplash.ts'

const site = {
  hero: {
    id: 'photo-1663664115297-72435cc95b9b',
    alt: 'Golden-hour exterior of a warm boutique lodge guest house with rich amber light',
  },
  'property-chababa': {
    id: 'photo-1674758979141-4e3521ba7321',
    alt: 'Chababa guest house — charming South African villa exterior in warm daytime light',
  },
  'property-interlaken-a': {
    id: 'photo-1636301587190-88cbb412fea0',
    alt: 'Interlaken A — residential guest house with green garden in sunny Stellenbosch-style setting',
  },
  'property-lantana': {
    id: 'photo-1687150416259-b48dd2260a7f',
    alt: 'Lantana — cosy boutique accommodation exterior at golden hour in the South African countryside',
  },
  'room-letimela': {
    id: 'photo-1776763018972-588e27bf6511',
    alt: 'Letimela family room with spacious layout, warm tones and comfortable seating area',
  },
  'room-calabash': {
    id: 'photo-1760573776062-7d2a7baeb49d',
    alt: 'Calabash double room with warm lighting and modern, clean finishes',
  },
  'room-blue-clouds': {
    id: 'photo-1648383228240-6ed939727ad6',
    alt: 'Blue Clouds twin room with light, airy neutral décor and two beds',
  },
  'conference-hero': {
    id: 'photo-1775492783108-5714035b298b',
    alt: 'Professional conference boardroom with seating and presentation setup',
  },
  'dining-restaurant': {
    id: 'photo-1776267074168-9bf2f21ec4fa',
    alt: 'Warm hotel breakfast buffet with pastries and inviting morning spread',
  },
  'dining-private-events': {
    id: 'photo-1768594407433-40b4b11039e8',
    alt: 'Elegantly set dining table for private events and celebrations',
  },
  'dining-outdoor': {
    id: 'photo-1772993629077-d7923d81adf4',
    alt: 'Outdoor restaurant seating with warm evening lighting and inviting patio',
  },
  'dining-bar': {
    id: 'photo-1692153142524-60285a93c249',
    alt: 'Welcoming hotel bar and lounge with warm ambient lighting',
  },
}

const roomPool = [
  'photo-1741506131058-533fcf894483',
  'photo-1739590269025-07766e4ab657',
  'photo-1689729771136-46e2ee831b83',
  'photo-1737517302831-e7b8a8eaa97c',
  'photo-1673687778498-5ddd20749408',
  'photo-1564501049412-61c2a3083791',
  'photo-1618773928121-c32242e63f39',
  'photo-1631049307264-da0ec9d70304',
  'photo-1590490360182-c33d57733427',
  'photo-1582719478250-c89cae4dc85b',
  'photo-1522771739844-6a9f6d5f14af',
  'photo-1505693416388-ac5ce068fe85',
  'photo-1759223198981-661cadbbff36',
  'photo-1718851972754-6638b49b4775',
  'photo-1660731513683-4cb0c9ac09b8',
  'photo-1560448204-e02f11c3d0e2',
  'photo-1776763018821-8feeaeeee0a5',
  'photo-1777180249046-abf7d640e0d9',
  'photo-1777169794972-12095816073b',
  'photo-1638277000768-005d326db4b2',
  'photo-1709755386664-573b8d9e9a38',
  'photo-1645941096092-60d99642dea0',
  'photo-1632598024410-3d8f24daab57',
  'photo-1585738067728-0033516f4a89',
  'photo-1636220245011-e049b34081cc',
  'photo-1551882547-ff40c63fe79e',
  'photo-1560195018-5bf6fb0fd24b',
]

const featuredKeys = {
  Letimela: 'room-letimela',
  Calabash: 'room-calabash',
  'Blue Clouds': 'room-blue-clouds',
}

let poolIdx = 0
const roomImages = {}

for (const room of rooms) {
  const key = room.name.toLowerCase().replace(/\s+/g, '-')
  const featured = featuredKeys[room.name]
  if (featured) {
    roomImages[key] = { ...site[featured], key: featured }
    continue
  }
  const id = roomPool[poolIdx++ % roomPool.length]
  roomImages[key] = {
    id,
    alt: `${room.name} room at Boga Legaba — ${room.configuration} accommodation in Mahikeng`,
  }
}

function toEntry({ id, alt }) {
  return { src: unsplashUrl(id), alt }
}

const out = { site: {}, rooms: {} }
for (const [k, v] of Object.entries(site)) {
  out.site[k] = toEntry(v)
}
for (const [k, v] of Object.entries(roomImages)) {
  out.rooms[k] = toEntry(v)
}

const ts = `import { unsplashUrl } from '@/lib/unsplash'

export type SiteImageData = { src: string; alt: string }

export const siteImages = ${JSON.stringify(out, null, 2).replace(/"src": "https:\/\/images\.unsplash\.com\/(photo-[^"]+)"/g, (_, id) => `"src": unsplashUrl('${id.replace(/\?.*$/, '')}')`)} as const

export function getSiteImage(key: keyof typeof siteImages.site): SiteImageData {
  return siteImages.site[key]
}

export function getRoomImage(roomName: string): SiteImageData {
  const key = roomName.toLowerCase().replace(/\\s+/g, '-')
  return siteImages.rooms[key as keyof typeof siteImages.rooms]
}
`

// Simpler: build with unsplashUrl in output directly
const lines = [
  `import { unsplashUrl } from '@/lib/unsplash'`,
  ``,
  `export type SiteImageData = { src: string; alt: string }`,
  ``,
  `export const siteImages = {`,
  `  site: {`,
]
for (const [k, v] of Object.entries(site)) {
  lines.push(`    '${k}': { src: unsplashUrl('${v.id}'), alt: ${JSON.stringify(v.alt)} },`)
}
lines.push(`  },`, `  rooms: {`)
for (const [k, v] of Object.entries(roomImages)) {
  lines.push(`    '${k}': { src: unsplashUrl('${v.id}'), alt: ${JSON.stringify(v.alt)} },`)
}
lines.push(`  },`, `} as const`, ``)
lines.push(`export function getSiteImage(key: keyof typeof siteImages.site): SiteImageData {`)
lines.push(`  return siteImages.site[key]`)
lines.push(`}`, ``)
lines.push(`export function getRoomImage(roomName: string): SiteImageData {`)
lines.push(`  const key = roomName.toLowerCase().replace(/\\s+/g, '-')`)
lines.push(`  return siteImages.rooms[key as keyof typeof siteImages.rooms]`)
lines.push(`}`)

writeFileSync(new URL('../data/images.ts', import.meta.url), lines.join('\n'))
console.log('Wrote data/images.ts with', Object.keys(roomImages).length, 'room images')
