import { siteImages } from './images'

export type GalleryCategory = 'All' | 'Rooms' | 'Properties' | 'Conference' | 'Dining'

export type GalleryItem = {
  id: string
  src: string
  alt: string
  category: Exclude<GalleryCategory, 'All'>
  span?: boolean
}

function categoryFromSiteKey(key: string): GalleryItem['category'] {
  if (key.startsWith('property-') || key === 'hero') return 'Properties'
  if (key.startsWith('room-')) return 'Rooms'
  if (key.startsWith('conference-')) return 'Conference'
  if (key.startsWith('dining-')) return 'Dining'
  return 'Properties'
}

const GALLERY_SPAN_IDS = new Set([
  'site-hero',
  'site-property-interlaken-a',
  'site-conference-hero',
  'room-reeds',
  'room-calabash',
  'room-letimela',
])

export function getGalleryItems(): GalleryItem[] {
  const seen = new Set<string>()
  const items: GalleryItem[] = []

  for (const [key, img] of Object.entries(siteImages.site)) {
    if (seen.has(img.src)) continue
    seen.add(img.src)
    const id = `site-${key}`
    items.push({
      id,
      src: img.src,
      alt: img.alt,
      category: categoryFromSiteKey(key),
      span: GALLERY_SPAN_IDS.has(id),
    })
  }

  for (const [key, img] of Object.entries(siteImages.rooms)) {
    if (seen.has(img.src)) continue
    seen.add(img.src)
    const id = `room-${key}`
    items.push({
      id,
      src: img.src,
      alt: img.alt,
      category: 'Rooms',
      span: GALLERY_SPAN_IDS.has(id),
    })
  }

  return items
}

export const galleryCategories: GalleryCategory[] = [
  'All',
  'Rooms',
  'Properties',
  'Conference',
  'Dining',
]

export const galleryFilterSuggestions = [
  'Rooms',
  'Properties',
  'Conference',
  'Dining',
  'Chababa',
  'Lantana',
  'Mahikeng',
]

export function galleryItemSearchText(item: GalleryItem) {
  return [item.alt, item.category, item.id.replace(/-/g, ' ')].join(' ')
}
