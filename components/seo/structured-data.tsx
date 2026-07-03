import { lodgingBusinessJsonLd } from "@/lib/seo"

/**
 * Injects schema.org LodgingBusiness JSON-LD. Rendered once in the root layout
 * so it appears on every page. Server component — no client JS.
 */
export function StructuredData() {
  return (
    <script
      type="application/ld+json"
      // Content is our own trusted, static object — safe to serialise directly.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(lodgingBusinessJsonLd()) }}
    />
  )
}
