/**
 * Server-side, override-aware resolver for the marketing-page image slots.
 *
 * Reads admin overrides from the `site_images` table once per render (deduped
 * via React cache) and layers them over the built-in defaults from
 * lib/site-image-slots.ts. FAILS OPEN: if the table is missing, empty, or the
 * DB errors, every slot resolves to its default — so pages can never break
 * because of this layer.
 *
 * Server-only (imports the Supabase admin client). Client components that need
 * these images must receive them as props resolved by a server parent.
 */
import { cache } from "react"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { SITE_IMAGE_DEFAULTS } from "@/lib/site-image-slots"
import { getSiteImage as getStaticSiteImage } from "@/lib/site-images"

export type ResolvedImage = { url: string; alt: string }

/** All overrides as a key→{url,alt} map. Cached for the duration of one render. */
export const getSiteImageOverrides = cache(async (): Promise<Record<string, ResolvedImage>> => {
  try {
    const sb = createSupabaseAdminClient()
    const { data, error } = await sb.from("site_images").select("image_key, image_url, alt")
    if (error || !data) return {}
    const map: Record<string, ResolvedImage> = {}
    for (const row of data) {
      const r = row as { image_key: string; image_url: string; alt: string | null }
      if (r.image_url) map[r.image_key] = { url: r.image_url, alt: r.alt ?? "" }
    }
    return map
  } catch {
    return {}
  }
})

/** Default (url+alt) for a slot key — registry first, then the static file. */
function defaultFor(key: string): ResolvedImage {
  return SITE_IMAGE_DEFAULTS[key] ?? getStaticSiteImage(key)
}

/** Resolve one slot: admin override if set, else the built-in default. */
export async function resolveSiteImage(key: string): Promise<ResolvedImage> {
  const override = (await getSiteImageOverrides())[key]
  const fallback = defaultFor(key)
  if (override?.url) return { url: override.url, alt: override.alt || fallback.alt }
  return fallback
}

/**
 * Synchronous resolver against an already-fetched override map — for callers
 * that resolve MANY keys in one render (loops, arrays) and don't want an await
 * per key. Fetch the map once with getSiteImageOverrides(), then call this.
 */
export function resolveSiteImageFrom(
  overrides: Record<string, ResolvedImage>,
  key: string,
): ResolvedImage {
  const override = overrides[key]
  const fallback = defaultFor(key)
  if (override?.url) return { url: override.url, alt: override.alt || fallback.alt }
  return fallback
}
