// =============================================================================
// Boga Legaba — Room & Property data
// Update this file to manage room inventory. Used across Stay, Gallery, Book Now.
// =============================================================================

export type BedConfig = "Twin" | "Double" | "Family" | "Triple" | "TBC"
export type BathroomType = "Bath only" | "Shower only" | "Bath & Shower" | "TBC"

export type PropertyId = "chababa" | "interlaken-a" | "lantana" | "transnet"

export interface Room {
  name: string
  config: BedConfig
  bathroom: BathroomType
  description: string
}

export interface Property {
  id: PropertyId
  name: string
  code: string // e.g. "8 Interlaken"
  address: string
  tagline: string
  color: string // CSS color var token name
  colorHex: string
  roomCount: number
  description: string
  locationNote: string
  whatsapp: string // wa.me link
  rooms: Room[]
}

export const properties: Property[] = [
  {
    id: "chababa",
    name: "Chababa",
    code: "8 Interlaken",
    address: "8 Interlaken Avenue, Riviera Park, Mahikeng, 2745",
    tagline: "The Volume Driver",
    color: "prop-chababa",
    colorHex: "#d4a017",
    roomCount: 10,
    description: "General residential stays with a Double & Twin focus — our most flexible property for individual and short-stay travellers.",
    locationNote:
      "Chababa is located at 8 Interlaken Avenue — a different address to Interlaken A. Please confirm your arrival address at time of booking.",
    whatsapp: "https://wa.me/27828757018?text=Hi%20Boga%20Legaba%2C%20I%27d%20like%20to%20enquire%20about%20Chababa%20(8%20Interlaken).",
    rooms: [
      { name: "Beads", config: "Double", bathroom: "Bath only", description: "A warm, comfortable double room ideal for solo business travellers." },
      { name: "Blue Clouds", config: "Twin", bathroom: "Bath & Shower", description: "Twin beds with a full en-suite — perfect for colleagues sharing." },
      { name: "Flutes", config: "Twin", bathroom: "Shower only", description: "Bright twin room with a quick, convenient shower setup." },
      { name: "Hunters", config: "Double", bathroom: "Shower only", description: "Restful double room with modern finishes and fast Wi-Fi." },
      { name: "Huts", config: "Double", bathroom: "Shower only", description: "Cosy double, well-suited to extended residential stays." },
      { name: "Letimela", config: "Family", bathroom: "Bath & Shower", description: "Spacious family room with both bath and shower for added comfort." },
      { name: "Modjadji", config: "Double", bathroom: "Shower only", description: "Quiet double room with workspace and blackout curtains." },
      { name: "Queens", config: "Double", bathroom: "Shower only", description: "Generous double room with a relaxed, homely atmosphere." },
      { name: "Reeds", config: "Double", bathroom: "Bath & Shower", description: "Double room featuring a full bathroom with bath and shower." },
      { name: "Spears", config: "Twin", bathroom: "Shower only", description: "Practical twin configuration for two-person work trips." },
    ],
  },
  {
    id: "interlaken-a",
    name: "Interlaken A",
    code: "6 Interlaken",
    address: "6 Interlaken Avenue, Riviera Park, Mahikeng, 2745",
    tagline: "The Multi-Occupancy Hub",
    color: "prop-interlaken",
    colorHex: "#e07b39",
    roomCount: 6,
    description: "Family and triple configurations built for groups, project teams, and longer multi-occupancy stays.",
    locationNote: "Interlaken A is located at 6 Interlaken Avenue, Riviera Park, Mahikeng.",
    whatsapp: "https://wa.me/27828757018?text=Hi%20Boga%20Legaba%2C%20I%27d%20like%20to%20enquire%20about%20Interlaken%20A%20(6%20Interlaken).",
    rooms: [
      { name: "A Mulher Africana", config: "Family", bathroom: "Shower only", description: "A characterful family room celebrating African heritage." },
      { name: "Blue Sea", config: "Twin", bathroom: "Shower only", description: "Calm twin room with a refreshing, coastal-inspired palette." },
      { name: "Red Room", config: "Double", bathroom: "Bath only", description: "Bold double room with a relaxing soak-in bath." },
      { name: "Calabash", config: "Double", bathroom: "Bath & Shower", description: "Comfortable double with a full en-suite bathroom." },
      { name: "Segametsi", config: "Family", bathroom: "Shower only", description: "Roomy family option ideal for parents travelling with children." },
      { name: "Squater Comfort", config: "Triple", bathroom: "Shower only", description: "Three single beds — great value for project teams and groups." },
    ],
  },
  {
    id: "lantana",
    name: "Lantana",
    code: "10 Lantana",
    address: "10 Lantana Street, Mahikeng",
    tagline: "The Conference Core",
    color: "prop-lantana",
    colorHex: "#4a90d9",
    roomCount: 7,
    description: "Corporate and events focus, anchored by our conference facility. The home of business stays at Boga Legaba.",
    locationNote: "Lantana is located at 10 Lantana Street, Mahikeng.",
    whatsapp: "https://wa.me/27828757018?text=Hi%20Boga%20Legaba%2C%20I%27d%20like%20to%20enquire%20about%20Lantana%20(10%20Lantana)%20%26%20Conference.",
    rooms: [
      { name: "Modiga", config: "TBC", bathroom: "TBC", description: "Room details are being finalised — enquire for current availability." },
      { name: "Mojamorago", config: "TBC", bathroom: "TBC", description: "Room details are being finalised — enquire for current availability." },
      { name: "Mophato", config: "TBC", bathroom: "TBC", description: "Room details are being finalised — enquire for current availability." },
      { name: "Motswakgomo", config: "TBC", bathroom: "TBC", description: "Room details are being finalised — enquire for current availability." },
      { name: "Lantana Room 5", config: "TBC", bathroom: "TBC", description: "Room details are being finalised — enquire for current availability." },
      { name: "Lantana Room 6", config: "TBC", bathroom: "TBC", description: "Room details are being finalised — enquire for current availability." },
      { name: "Lantana Room 7", config: "TBC", bathroom: "TBC", description: "Room details are being finalised — enquire for current availability." },
    ],
  },
  {
    id: "transnet",
    name: "Transnet Portfolio",
    code: "Transnet",
    address: "Mahikeng — address confirmed at booking",
    tagline: "The Extended Inventory",
    color: "prop-transnet",
    colorHex: "#6b4fa0",
    roomCount: 4,
    description: "Additional rooms within our managed Transnet portfolio. Available on request for overflow and block bookings.",
    locationNote: "Transnet Portfolio rooms — please confirm your arrival address at time of booking.",
    whatsapp: "https://wa.me/27828757018?text=Hi%20Boga%20Legaba%2C%20I%27d%20like%20to%20enquire%20about%20the%20Transnet%20Portfolio%20rooms.",
    rooms: [
      { name: "Lokomotief", config: "TBC", bathroom: "TBC", description: "Room details are being finalised — enquire for current availability." },
      { name: "Mjantshi", config: "TBC", bathroom: "TBC", description: "Room details are being finalised — enquire for current availability." },
      { name: "Shosholoza", config: "TBC", bathroom: "TBC", description: "Room details are being finalised — enquire for current availability." },
      { name: "Stimela", config: "TBC", bathroom: "TBC", description: "Room details are being finalised — enquire for current availability." },
    ],
  },
]

export function getProperty(id: PropertyId): Property | undefined {
  return properties.find((p) => p.id === id)
}

export const BUSINESS = {
  name: "Boga Legaba Guest House & Conference Centre",
  phone: "+27 82 875 7018",
  phoneHref: "tel:+27828757018",
  email: "info@bogalegaba.co.za",
  website: "www.bogalegaba.co.za",
  whatsappGeneral:
    "https://wa.me/27828757018?text=Hi%20Boga%20Legaba%2C%20I%27d%20like%20to%20make%20an%20enquiry.",
}

/** Primary map / directions location (Riviera Park, Mahikeng) */
export const LOCATION = {
  streetAddress: "Riviera Park",
  city: "Mahikeng",
  province: "North West Province",
  country: "South Africa",
  postalCode: "2745",
  coordinates: { lat: -25.8658, lng: 25.6442 },
  mapEmbedUrl: "https://www.google.com/maps?q=Riviera+Park+Mahikeng&output=embed",
  directionsUrl:
    "https://www.google.com/maps/dir/?api=1&destination=Riviera+Park+Mahikeng,+South+Africa",
  mapsUrl: "https://www.google.com/maps?q=Riviera+Park+Mahikeng",
  travelNote: "Approximately 5 minutes from Mmabatho CBD",
  nearbyLandmarks: ["Mmabatho CBD", "North-West University", "Provincial Government precinct"],
}

export function getLocationFullAddress(): string {
  return `${LOCATION.streetAddress}, ${LOCATION.city}, ${LOCATION.postalCode}, ${LOCATION.province}, ${LOCATION.country}`
}
