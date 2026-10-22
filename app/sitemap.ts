import type { MetadataRoute } from "next"
import { SITE_URL, SEO_ROUTES, PENDING_LEGAL_ROUTES } from "@/lib/seo"

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  // Placeholder legal pages ([TODO] copy) are withheld from the sitemap so
  // they cannot surface in search results with unfinished wording.
  const routes = SEO_ROUTES.filter(
    (route) => !(PENDING_LEGAL_ROUTES as readonly string[]).includes(route),
  )
  return routes.map((route) => {
    const path = route ? `/${route}` : ""
    const fresh = route === "" || route === "stay" || route === "specials"
    return {
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency: fresh ? "weekly" : "monthly",
      priority: route === "" ? 1 : route === "stay" || route === "book-now" ? 0.9 : 0.7,
    }
  })
}
