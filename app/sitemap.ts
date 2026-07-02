import type { MetadataRoute } from "next"
import { SITE_URL, SEO_ROUTES } from "@/lib/seo"

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return SEO_ROUTES.map((route) => {
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
