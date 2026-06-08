import { unsplashUrl } from '@v2/lib/unsplash'

export type SiteImageData = { src: string; alt: string }

export const siteImages = {
  site: {
    'hero': { src: unsplashUrl('photo-1663664115297-72435cc95b9b'), alt: "Golden-hour exterior of a warm boutique African lodge guest house with rich amber light" },
    'property-chababa': { src: unsplashUrl('photo-1674758979141-4e3521ba7321'), alt: "Chababa guest house — charming South African villa exterior in warm daytime light" },
    'property-interlaken-a': { src: unsplashUrl('photo-1636301587190-88cbb412fea0'), alt: "Interlaken A — residential guest house with green garden in sunny setting" },
    'property-lantana': { src: unsplashUrl('photo-1687150416259-b48dd2260a7f'), alt: "Lantana — cosy boutique accommodation exterior at golden hour in the South African countryside" },
    'room-letimela': { src: unsplashUrl('photo-1776763018972-588e27bf6511'), alt: "Letimela family room with spacious layout, warm tones and comfortable seating area" },
    'room-calabash': { src: unsplashUrl('photo-1760573776062-7d2a7baeb49d'), alt: "Calabash double room with warm lighting and modern, clean finishes" },
    'room-blue-clouds': { src: unsplashUrl('photo-1648383228240-6ed939727ad6'), alt: "Blue Clouds twin room with light, airy neutral décor and two beds" },
    'conference-hero': { src: unsplashUrl('photo-1775492783108-5714035b298b'), alt: "Professional conference boardroom with seating and presentation setup" },
    'dining-restaurant': { src: unsplashUrl('photo-1776267074168-9bf2f21ec4fa'), alt: "Warm hotel breakfast buffet with pastries and inviting morning spread" },
    'dining-private-events': { src: unsplashUrl('photo-1768594407433-40b4b11039e8'), alt: "Elegantly set dining table for private events and celebrations" },
    'dining-outdoor': { src: unsplashUrl('photo-1772993629077-d7923d81adf4'), alt: "Outdoor restaurant seating with warm evening lighting and inviting patio" },
    'dining-bar': { src: unsplashUrl('photo-1692153142524-60285a93c249'), alt: "Welcoming hotel bar and lounge with warm ambient lighting" },
  },
  rooms: {
    'beads': { src: unsplashUrl('photo-1741506131058-533fcf894483'), alt: "Beads room at Boga Legaba — Double accommodation in Mahikeng" },
    'blue-clouds': { src: unsplashUrl('photo-1648383228240-6ed939727ad6'), alt: "Blue Clouds room at Boga Legaba — Twin accommodation in Mahikeng" },
    'flutes': { src: unsplashUrl('photo-1739590269025-07766e4ab657'), alt: "Flutes room at Boga Legaba — Twin accommodation in Mahikeng" },
    'hunters': { src: unsplashUrl('photo-1689729771136-46e2ee831b83'), alt: "Hunters room at Boga Legaba — Double accommodation in Mahikeng" },
    'huts': { src: unsplashUrl('photo-1737517302831-e7b8a8eaa97c'), alt: "Huts room at Boga Legaba — Double accommodation in Mahikeng" },
    'letimela': { src: unsplashUrl('photo-1776763018972-588e27bf6511'), alt: "Letimela room at Boga Legaba — Family accommodation in Mahikeng" },
    'modjadji': { src: unsplashUrl('photo-1673687778498-5ddd20749408'), alt: "Modjadji room at Boga Legaba — Double accommodation in Mahikeng" },
    'queens': { src: unsplashUrl('photo-1564501049412-61c2a3083791'), alt: "Queens room at Boga Legaba — Double accommodation in Mahikeng" },
    'reeds': { src: unsplashUrl('photo-1618773928121-c32242e63f39'), alt: "Reeds room at Boga Legaba — Double accommodation in Mahikeng" },
    'spears': { src: unsplashUrl('photo-1631049307264-da0ec9d70304'), alt: "Spears room at Boga Legaba — Twin accommodation in Mahikeng" },
    'a-mulher-africana': { src: unsplashUrl('photo-1590490360182-c33d57733427'), alt: "A Mulher Africana room at Boga Legaba — Family accommodation in Mahikeng" },
    'blue-sea': { src: unsplashUrl('photo-1582719478250-c89cae4dc85b'), alt: "Blue Sea room at Boga Legaba — Twin accommodation in Mahikeng" },
    'red-room': { src: unsplashUrl('photo-1522771739844-6a9f6d5f14af'), alt: "Red Room room at Boga Legaba — Double accommodation in Mahikeng" },
    'calabash': { src: unsplashUrl('photo-1760573776062-7d2a7baeb49d'), alt: "Calabash room at Boga Legaba — Double accommodation in Mahikeng" },
    'segametsi': { src: unsplashUrl('photo-1505693416388-ac5ce068fe85'), alt: "Segametsi room at Boga Legaba — Family accommodation in Mahikeng" },
    'squater-comfort': { src: unsplashUrl('photo-1759223198981-661cadbbff36'), alt: "Squater Comfort room at Boga Legaba — Triple accommodation in Mahikeng" },
    'modiga': { src: unsplashUrl('photo-1718851972754-6638b49b4775'), alt: "Modiga room at Boga Legaba — TBC accommodation in Mahikeng" },
    'mojamorago': { src: unsplashUrl('photo-1660731513683-4cb0c9ac09b8'), alt: "Mojamorago room at Boga Legaba — TBC accommodation in Mahikeng" },
    'mophato': { src: unsplashUrl('photo-1560448204-e02f11c3d0e2'), alt: "Mophato room at Boga Legaba — TBC accommodation in Mahikeng" },
    'motswakgomo': { src: unsplashUrl('photo-1776763018821-8feeaeeee0a5'), alt: "Motswakgomo room at Boga Legaba — TBC accommodation in Mahikeng" },
    'lantana-room-5': { src: unsplashUrl('photo-1777180249046-abf7d640e0d9'), alt: "Lantana Room 5 room at Boga Legaba — TBC accommodation in Mahikeng" },
    'lantana-room-6': { src: unsplashUrl('photo-1777169794972-12095816073b'), alt: "Lantana Room 6 room at Boga Legaba — TBC accommodation in Mahikeng" },
    'lantana-room-7': { src: unsplashUrl('photo-1638277000768-005d326db4b2'), alt: "Lantana Room 7 room at Boga Legaba — TBC accommodation in Mahikeng" },
    'lokomotief': { src: unsplashUrl('photo-1709755386664-573b8d9e9a38'), alt: "Lokomotief room at Boga Legaba — TBC accommodation in Mahikeng" },
    'mjantshi': { src: unsplashUrl('photo-1645941096092-60d99642dea0'), alt: "Mjantshi room at Boga Legaba — TBC accommodation in Mahikeng" },
    'shosholoza': { src: unsplashUrl('photo-1632598024410-3d8f24daab57'), alt: "Shosholoza room at Boga Legaba — TBC accommodation in Mahikeng" },
    'stimela': { src: unsplashUrl('photo-1585738067728-0033516f4a89'), alt: "Stimela room at Boga Legaba — TBC accommodation in Mahikeng" },
  },
} as const

export function getSiteImage(key: keyof typeof siteImages.site): SiteImageData {
  return siteImages.site[key]
}

export function getRoomImage(roomName: string): SiteImageData {
  const key = roomName.toLowerCase().replace(/\s+/g, '-')
  const hit = siteImages.rooms[key as keyof typeof siteImages.rooms]
  if (hit) return hit
  return getSiteImage('hero')
}