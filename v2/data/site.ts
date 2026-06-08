import { v2Path } from '@v2/lib/paths'

export type PropertyKey = 'chababa' | 'interlaken-a' | 'lantana' | 'transnet'

export interface Property {
  key: PropertyKey
  name: string
  code: string
  address: string
  area: string
  rooms: number
  color: string
  whatsapp: string // E.164 digits only
}

export const PHONE = '+27 82 875 7018'
export const EMAIL = 'info@bogalegaba.co.za'
export const WEBSITE = 'www.bogalegaba.co.za'

export const properties: Property[] = [
  {
    key: 'chababa',
    name: 'Chababa',
    code: '8 INTERLAKEN',
    address: '8 Interlaken Avenue',
    area: 'Riviera Park, Mahikeng, 2745',
    rooms: 10,
    color: '#0a0a0a',
    whatsapp: '27828757018',
  },
  {
    key: 'interlaken-a',
    name: 'Interlaken A',
    code: '6 INTERLAKEN',
    address: '6 Interlaken Avenue',
    area: 'Riviera Park, Mahikeng, 2745',
    rooms: 6,
    color: '#525252',
    whatsapp: '27828757018',
  },
  {
    key: 'lantana',
    name: 'Lantana',
    code: '10 LANTANA',
    address: '10 Lantana Street',
    area: 'Mahikeng',
    rooms: 7,
    color: '#737373',
    whatsapp: '27828757018',
  },
  {
    key: 'transnet',
    name: 'Transnet Portfolio',
    code: 'TRANSNET',
    address: 'Transnet Portfolio',
    area: 'Mahikeng',
    rooms: 4,
    color: '#404040',
    whatsapp: '27828757018',
  },
]

export function propertyByKey(key: PropertyKey) {
  return properties.find((p) => p.key === key)!
}

export function waLink(propertyKey: PropertyKey, message: string) {
  const p = propertyByKey(propertyKey)
  return `https://wa.me/${p.whatsapp}?text=${encodeURIComponent(message)}`
}

const NAV_ROUTES = [
  { path: '/stay', label: 'Stay' },
  { path: '/conference', label: 'Conference' },
  { path: '/corporate', label: 'Corporate' },
  { path: '/dining', label: 'Dining' },
  { path: '/attractions', label: 'Attractions' },
  { path: '/specials', label: 'Specials' },
  { path: '/gallery', label: 'Gallery' },
  { path: '/faqs', label: 'FAQs' },
  { path: '/', label: 'Home' },
  { path: '/contact', label: 'Contact' },
] as const

export const navLinks = NAV_ROUTES.map(({ path, label }) => ({
  href: v2Path(path),
  label,
}))
