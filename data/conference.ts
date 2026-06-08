export const CONFERENCE_SETUPS = ["Theatre", "Boardroom", "U-Shape", "Classroom", "Cocktail"] as const
export const CONFERENCE_AV = ["Projector", "Screen", "Microphone", "PA System", "Video Conferencing"] as const
export const CONFERENCE_CATERING = ["Morning Tea", "Lunch", "Afternoon Tea", "Dinner", "Full Day Package"] as const

export type ConferenceSetup = (typeof CONFERENCE_SETUPS)[number]
export type ConferenceAv = (typeof CONFERENCE_AV)[number]
export type ConferenceCatering = (typeof CONFERENCE_CATERING)[number]
export type ConferencePackageType = "Half Day" | "Full Day" | "Residential"

export interface ConferenceOffering {
  id: string
  kind: "package" | "capability"
  name: string
  summary: string
  packageType?: ConferencePackageType
  capacityMax?: number
  setups: ConferenceSetup[]
  av: ConferenceAv[]
  catering: ConferenceCatering[]
  accommodation: boolean
  amenities: string[]
  featured?: boolean
  priceLabel?: string
  highlights?: string[]
}

export const CONFERENCE_OFFERINGS: ConferenceOffering[] = [
  {
    id: "pkg-half-day",
    kind: "package",
    name: "Half Day",
    summary: "Morning or afternoon conference with tea and core AV.",
    packageType: "Half Day",
    capacityMax: 80,
    setups: ["Theatre", "Boardroom", "U-Shape", "Classroom"],
    av: ["Projector", "Screen", "Microphone"],
    catering: ["Morning Tea", "Afternoon Tea"],
    accommodation: false,
    amenities: ["Wi-Fi", "Parking", "Coordinator"],
    priceLabel: "From R—",
    highlights: ["Venue hire (4 hrs)", "Morning OR afternoon tea", "Projector & screen", "Wi-Fi & parking"],
  },
  {
    id: "pkg-full-day",
    kind: "package",
    name: "Full Day",
    summary: "Full-day delegate programme with lunch and complete AV.",
    packageType: "Full Day",
    capacityMax: 80,
    setups: ["Theatre", "Boardroom", "U-Shape", "Classroom", "Cocktail"],
    av: ["Projector", "Screen", "Microphone", "PA System", "Video Conferencing"],
    catering: ["Morning Tea", "Lunch", "Afternoon Tea", "Full Day Package"],
    accommodation: false,
    amenities: ["Wi-Fi", "Parking", "Coordinator"],
    featured: true,
    priceLabel: "From R—",
    highlights: ["Venue hire (8 hrs)", "Two teas + lunch", "Full AV package", "Dedicated coordinator"],
  },
  {
    id: "pkg-residential",
    kind: "package",
    name: "Residential",
    summary: "Conference plus on-site overnight accommodation for delegates.",
    packageType: "Residential",
    capacityMax: 80,
    setups: ["Theatre", "Boardroom", "U-Shape", "Classroom"],
    av: ["Projector", "Screen", "Microphone", "PA System"],
    catering: ["Morning Tea", "Lunch", "Afternoon Tea", "Dinner", "Full Day Package"],
    accommodation: true,
    amenities: ["Wi-Fi", "Parking", "Coordinator", "Accommodation"],
    priceLabel: "From R—",
    highlights: ["Full day conference", "Overnight accommodation", "Breakfast & dinner", "Group rate per delegate"],
  },
  {
    id: "cap-theatre",
    kind: "capability",
    name: "Theatre Setup",
    summary: "Presentation-style seating for larger groups up to 80 delegates.",
    capacityMax: 80,
    setups: ["Theatre"],
    av: ["Projector", "Screen", "PA System"],
    catering: ["Morning Tea", "Lunch", "Afternoon Tea"],
    accommodation: false,
    amenities: ["Wi-Fi", "Parking"],
  },
  {
    id: "cap-boardroom",
    kind: "capability",
    name: "Boardroom Setup",
    summary: "Intimate executive layout for focused meetings.",
    capacityMax: 24,
    setups: ["Boardroom"],
    av: ["Projector", "Screen", "Video Conferencing"],
    catering: ["Morning Tea", "Lunch"],
    accommodation: false,
    amenities: ["Wi-Fi", "Parking"],
  },
  {
    id: "cap-video",
    kind: "capability",
    name: "Hybrid & Video Conferencing",
    summary: "Connect remote participants with full AV support.",
    capacityMax: 80,
    setups: ["Boardroom", "U-Shape", "Classroom"],
    av: ["Projector", "Screen", "Microphone", "PA System", "Video Conferencing"],
    catering: ["Morning Tea", "Afternoon Tea"],
    accommodation: false,
    amenities: ["Wi-Fi", "High-speed internet"],
  },
  {
    id: "cap-cocktail",
    kind: "capability",
    name: "Cocktail & Networking",
    summary: "Standing reception layout for launches and networking events.",
    capacityMax: 60,
    setups: ["Cocktail"],
    av: ["Microphone", "PA System"],
    catering: ["Afternoon Tea", "Dinner"],
    accommodation: false,
    amenities: ["Wi-Fi", "Parking"],
  },
]

export const CONFERENCE_SEARCH_SUGGESTIONS: string[] = [
  ...CONFERENCE_SETUPS,
  ...CONFERENCE_AV,
  ...CONFERENCE_CATERING,
  "Half Day",
  "Full Day",
  "Residential",
  "Accommodation",
  "Wi-Fi",
  "Parking",
  "80 delegates",
  "Boardroom",
  "Theatre",
  "Lunch",
  "Video",
  "Government",
  "Corporate",
]

function offeringSearchText(o: ConferenceOffering): string {
  return [
    o.name,
    o.summary,
    o.packageType,
    o.capacityMax?.toString(),
    ...o.setups,
    ...o.av,
    ...o.catering,
    ...o.amenities,
    ...(o.highlights ?? []),
    o.accommodation ? "accommodation" : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

export function filterConferenceOfferings(criteria: string[]): ConferenceOffering[] {
  const terms = criteria.map((c) => c.trim().toLowerCase()).filter(Boolean)
  if (terms.length === 0) return CONFERENCE_OFFERINGS

  return CONFERENCE_OFFERINGS.filter((offering) => {
    const haystack = offeringSearchText(offering)
    return terms.every((term) => haystack.includes(term))
  })
}
