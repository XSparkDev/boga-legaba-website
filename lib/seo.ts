/**
 * Shared SEO constants + structured-data builder.
 * Additive only - nothing here changes existing routes or behaviour.
 */
import { BUSINESS, LOCATION } from "@/data/rooms"

// Canonical site origin. Override with NEXT_PUBLIC_SITE_URL in the environment;
// falls back to the live domain. No trailing slash.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.bogalegaba.co.za"
).replace(/\/+$/, "")

// Public, indexable routes (matches the site structure + About).
export const SEO_ROUTES = [
  "", // home
  "stay",
  "conference",
  "corporate",
  "dining",
  "attractions",
  "specials",
  "gallery",
  "faqs",
  "contact",
  "book-now",
  "about",
  "privacy",
  "terms",
  "booking-terms",
  "cancellation-policy",
  "cookies",
] as const

/**
 * Legal pages that still hold placeholder wording (visible [TODO] markers).
 * They stay reachable by direct URL for client review, but they are marked
 * noindex and excluded from the sitemap so no customer meets the placeholder
 * copy through search. Remove a route from this list once its content is
 * approved (and drop the noindex robots meta on that page).
 */
export const PENDING_LEGAL_ROUTES = [
  "privacy",
  "terms",
  "booking-terms",
  "cancellation-policy",
  "cookies",
] as const

/** schema.org LodgingBusiness JSON-LD for the guest house. */
export function lodgingBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "@id": `${SITE_URL}/#lodging`,
    name: BUSINESS.name,
    description:
      "Premium guest house and conference venue in Mahikeng, North West Province: corporate & government accommodation and conferences.",
    url: SITE_URL,
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    image: `${SITE_URL}/hero-exterior.png`,
    logo: `${SITE_URL}/logo.png`,
    priceRange: "$$",
    currenciesAccepted: "ZAR",
    address: {
      "@type": "PostalAddress",
      streetAddress: LOCATION.streetAddress,
      addressLocality: LOCATION.city,
      addressRegion: LOCATION.province,
      postalCode: LOCATION.postalCode,
      addressCountry: "ZA",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: LOCATION.coordinates.lat,
      longitude: LOCATION.coordinates.lng,
    },
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Free WiFi", value: true },
      { "@type": "LocationFeatureSpecification", name: "Free parking", value: true },
      { "@type": "LocationFeatureSpecification", name: "Conference facilities", value: true },
    ],
    areaServed: `${LOCATION.city}, ${LOCATION.province}`,
  }
}
