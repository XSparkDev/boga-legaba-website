import { siteImages, type SiteImage, type SiteImageKey } from "@/data/site-images"

const FALLBACK: SiteImageKey = "hero"

export function getSiteImage(key: string): SiteImage {
  if (key in siteImages) {
    return siteImages[key as SiteImageKey]
  }
  return siteImages[FALLBACK]
}

export function getRoomImageKey(propertyId: string, roomName: string): string {
  const slug = roomName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  return `room.${propertyId}.${slug}`
}

export function getRoomImage(
  propertyId: string,
  roomName: string,
  propertyName: string,
): SiteImage {
  const key = getRoomImageKey(propertyId, roomName)
  const img = getSiteImage(key)
  return {
    url: img.url,
    alt: `${roomName} room at ${propertyName} — ${img.alt}`,
  }
}
