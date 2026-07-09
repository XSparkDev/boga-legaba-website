/**
 * Google Places reviews with a 24h database cache.
 *
 * The home page shows Google reviews. Google's Places API is billed per call,
 * so we DON'T hit it on every page view. Instead:
 *   1. Read the cached row from google_reviews_cache (keyed by place_id).
 *   2. If it's fresh (< CACHE_TTL_HOURS old), return it — no API call.
 *   3. If it's stale or missing, call Google ONCE, store the result, return it.
 *
 * Everything fails OPEN: a missing table, a DB error, a blocked/unbilled API
 * key, or a network blip all resolve to "return whatever we last cached, else
 * an empty list" — the home page must never crash because of reviews.
 *
 * Server-only: GOOGLE_PLACES_API_KEY must never reach the browser (no
 * NEXT_PUBLIC_ prefix), so only import this from server components / route
 * handlers.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

const CACHE_TTL_HOURS = 24

export type GoogleReview = {
  author: string
  authorPhoto: string | null
  rating: number
  text: string
  relativeTime: string
}

export type GoogleReviewsData = {
  rating: number | null
  totalRatings: number | null
  reviews: GoogleReview[]
  /** Where the data came from — useful for debugging/telemetry. */
  source: "cache" | "google" | "empty"
}

const EMPTY: GoogleReviewsData = { rating: null, totalRatings: null, reviews: [], source: "empty" }

function isFresh(fetchedAt: string): boolean {
  const ageMs = Date.now() - new Date(fetchedAt).getTime()
  return ageMs < CACHE_TTL_HOURS * 60 * 60 * 1000
}

/** New Places API (v1) review → our normalised shape. */
function normalizeV1(r: Record<string, unknown>): GoogleReview {
  const text = r.text as { text?: string } | undefined
  const author = r.authorAttribution as { displayName?: string; photoUri?: string } | undefined
  return {
    author: author?.displayName ?? "Google user",
    authorPhoto: author?.photoUri ?? null,
    rating: typeof r.rating === "number" ? r.rating : 0,
    text: text?.text ?? "",
    relativeTime: (r.relativePublishTimeDescription as string) ?? "",
  }
}

async function fetchFromGoogle(): Promise<GoogleReviewsData | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY
  const placeId = process.env.GOOGLE_PLACE_ID
  if (!key || !placeId) {
    console.warn("[google-reviews] GOOGLE_PLACES_API_KEY / GOOGLE_PLACE_ID not set — skipping fetch")
    return null
  }

  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "rating,userRatingCount,reviews",
      },
      // Reviews aren't time-critical; don't let a slow API hang the page render.
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      // A 403 here almost always means the Places API isn't enabled / billing
      // is off on the Google Cloud project — an EXPECTED setup state, not a
      // crash. Log it at warn level (never error) so Next.js doesn't surface a
      // red dev error overlay; the section just renders nothing until enabled.
      if (res.status === 403) {
        console.warn("[google-reviews] Places API not enabled yet — showing no reviews. Enable Places API (New) + billing in Google Cloud, then reviews appear automatically.")
      } else {
        console.warn(`[google-reviews] Google API HTTP ${res.status} — showing no reviews. ${body.slice(0, 200)}`)
      }
      return null
    }
    const data = (await res.json()) as {
      rating?: number
      userRatingCount?: number
      reviews?: Record<string, unknown>[]
    }
    return {
      rating: data.rating ?? null,
      totalRatings: data.userRatingCount ?? null,
      reviews: (data.reviews ?? []).map(normalizeV1).filter((r) => r.text),
      source: "google",
    }
  } catch (err) {
    // Network blip / timeout — expected-failure, degrade quietly (no overlay).
    console.warn("[google-reviews] fetch error — showing no reviews:", err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Public entry point. Returns cached reviews when fresh, otherwise refreshes
 * from Google and updates the cache. Never throws.
 */
export async function getGoogleReviews(): Promise<GoogleReviewsData> {
  const placeId = process.env.GOOGLE_PLACE_ID
  if (!placeId) return EMPTY

  let sb: ReturnType<typeof createSupabaseAdminClient> | null = null
  try {
    sb = createSupabaseAdminClient()
  } catch {
    // No DB — go straight to Google (still fails open if that's blocked too).
    return (await fetchFromGoogle()) ?? EMPTY
  }

  // 1. Try the cache.
  type CachedRow = { rating: number | null; total_ratings: number | null; reviews: GoogleReview[]; fetched_at: string }
  let cached: CachedRow | null = null
  try {
    const { data } = await sb
      .from("google_reviews_cache")
      .select("rating, total_ratings, reviews, fetched_at")
      .eq("place_id", placeId)
      .maybeSingle()
    if (data) cached = data as unknown as CachedRow
  } catch (err) {
    // Table may not exist yet — that's fine, we'll fetch live below.
    console.warn("[google-reviews] cache read failed (table missing?):", err instanceof Error ? err.message : err)
  }

  if (cached && isFresh(cached.fetched_at) && cached.reviews?.length) {
    return { rating: cached.rating, totalRatings: cached.total_ratings, reviews: cached.reviews, source: "cache" }
  }

  // 2. Cache stale/missing — refresh from Google.
  const fresh = await fetchFromGoogle()
  if (!fresh) {
    // Google unavailable: serve stale cache if we have any, else empty.
    if (cached?.reviews?.length) {
      return { rating: cached.rating, totalRatings: cached.total_ratings, reviews: cached.reviews, source: "cache" }
    }
    return EMPTY
  }

  // 3. Store the fresh result (best-effort — never block the page on the write).
  try {
    await sb.from("google_reviews_cache").upsert(
      {
        place_id: placeId,
        rating: fresh.rating,
        total_ratings: fresh.totalRatings,
        reviews: fresh.reviews,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "place_id" },
    )
  } catch (err) {
    console.warn("[google-reviews] cache write failed (table missing?):", err instanceof Error ? err.message : err)
  }

  return fresh
}
