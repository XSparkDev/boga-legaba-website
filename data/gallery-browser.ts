import { getSiteImage } from "@/lib/site-images"

export type GalleryCategory = "All" | "Chababa" | "Interlaken A" | "Lantana" | "Conference" | "Dining"

export interface GalleryBrowserItem {
  id: string
  label: string
  category: Exclude<GalleryCategory, "All">
  imageKey: string
  url: string
  alt: string
  span?: boolean
}

const GALLERY_ITEMS: Omit<GalleryBrowserItem, "url" | "alt">[] = [
  { id: "chababa-reeds", label: "Chababa · Reeds Room", category: "Chababa", imageKey: "gallery.chababa-reeds", span: true },
  { id: "chababa-lounge", label: "Chababa · Lounge", category: "Chababa", imageKey: "gallery.chababa-lounge" },
  { id: "interlaken-exterior", label: "Interlaken A · Exterior", category: "Interlaken A", imageKey: "gallery.interlaken-exterior", span: true },
  { id: "interlaken-segametsi", label: "Interlaken A · Segametsi", category: "Interlaken A", imageKey: "gallery.interlaken-segametsi" },
  { id: "lantana-garden", label: "Lantana · Garden", category: "Lantana", imageKey: "gallery.lantana-garden" },
  { id: "conference-theatre", label: "Conference · Theatre Setup", category: "Conference", imageKey: "gallery.conference-theatre", span: true },
  { id: "conference-boardroom", label: "Conference · Boardroom", category: "Conference", imageKey: "gallery.conference-boardroom" },
  { id: "dining-restaurant", label: "Dining · Restaurant", category: "Dining", imageKey: "gallery.dining-restaurant" },
  { id: "dining-bar", label: "Dining · Bar", category: "Dining", imageKey: "gallery.dining-bar" },
]

export const galleryCategories: GalleryCategory[] = [
  "All",
  "Chababa",
  "Interlaken A",
  "Lantana",
  "Conference",
  "Dining",
]

export const galleryFilterSuggestions = [
  "Chababa",
  "Interlaken",
  "Lantana",
  "Conference",
  "Dining",
  "Room",
  "Boardroom",
  "Theatre",
  "Mahikeng",
]

export function getGalleryBrowserItems(): GalleryBrowserItem[] {
  return GALLERY_ITEMS.map((item) => {
    const img = getSiteImage(item.imageKey)
    return { ...item, url: img.url, alt: img.alt }
  })
}

export function galleryItemSearchText(item: GalleryBrowserItem) {
  return [item.label, item.category, item.alt, item.imageKey.replace(/\./g, " ")].join(" ")
}
