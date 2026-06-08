export type ConferencePackage = {
  id: string
  name: string
  desc: string
  duration: 'half-day' | 'full-day' | 'residential'
  includesAv: boolean
  includesCatering: boolean
  includesAccommodation: boolean
  maxDelegates: number
}

export const conferencePackages: ConferencePackage[] = [
  {
    id: 'half-day',
    name: 'Half Day',
    desc: 'Venue, AV, morning tea and lunch for up to 80 delegates.',
    duration: 'half-day',
    includesAv: true,
    includesCatering: true,
    includesAccommodation: false,
    maxDelegates: 80,
  },
  {
    id: 'full-day',
    name: 'Full Day',
    desc: 'Venue, AV, two teas, lunch and all-day refreshments.',
    duration: 'full-day',
    includesAv: true,
    includesCatering: true,
    includesAccommodation: false,
    maxDelegates: 80,
  },
  {
    id: 'residential',
    name: 'Residential',
    desc: 'Full-day conferencing plus on-site accommodation and dinner.',
    duration: 'residential',
    includesAv: true,
    includesCatering: true,
    includesAccommodation: true,
    maxDelegates: 80,
  },
]

export const conferenceFilterSuggestions = [
  'Half day',
  'Full day',
  'Residential',
  'AV',
  'Catering',
  'Accommodation',
  '80 delegates',
]

export function conferencePackageSearchText(pkg: ConferencePackage) {
  return [
    pkg.name,
    pkg.desc,
    pkg.duration.replace('-', ' '),
    pkg.includesAv ? 'av audio visual projector' : '',
    pkg.includesCatering ? 'catering tea lunch dinner' : '',
    pkg.includesAccommodation ? 'accommodation rooms stay overnight residential' : '',
    `${pkg.maxDelegates} delegates`,
  ].join(' ')
}
