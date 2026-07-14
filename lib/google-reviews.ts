/**
 * Guest reviews shown on the home page, read from the `google_reviews` table
 * (see supabase/migrations/017_google_reviews.sql). Rows can come from two
 * sources, distinguished by the `source` column:
 *   - "live_api": synced from the Google Places API by /api/reviews/sync.
 *   - "manual_seed": curated by hand (the initial seed — see the migration).
 *
 * Priority: "live_api" rows take over the homepage ONLY once at least
 * MIN_LIVE_REVIEWS of them clear the star filter; otherwise the curated
 * "manual_seed" set is kept, so a listing with only a couple of good live
 * reviews can never make the section look sparse.
 *
 * The overall rating/review-count shown above the cards is NOT derived from
 * this table (the seeded rows are a curated subset, not the full public
 * review count) — it's a fixed business figure, exported below.
 *
 * Fails open: a missing table or DB error resolves to an empty review list
 * so the home page never crashes because of reviews.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

/** Fixed overall rating summary shown above the review cards. */
export const OVERALL_RATING = 4.0
export const OVERALL_REVIEW_COUNT = 312

/**
 * Minimum number of live-API reviews that must pass the ≥3-star filter before
 * they replace the curated manual_seed set on the homepage. Below this, the
 * homepage keeps showing manual_seed so the section never looks sparse.
 */
export const MIN_LIVE_REVIEWS = 5

export type GuestReview = {
  author: string
  rating: number
  text: string
  relativeTime: string
}

/**
 * Reviews rated below 3 stars are excluded at the query level (not deleted
 * from the table) so low ratings never show on the site but remain in the
 * data for the business to see.
 */
export async function getGuestReviews(): Promise<GuestReview[]> {
  let sb: ReturnType<typeof createSupabaseAdminClient> | null = null
  try {
    sb = createSupabaseAdminClient()
  } catch {
    return []
  }

  try {
    const { data, error } = await sb
      .from("google_reviews")
      .select("author_name, rating, review_text, relative_time, source")
      .gte("rating", 3)
      .order("id", { ascending: true })
    if (error) throw error

    const rows = data ?? []
    // `rows` is already filtered to rating >= 3, so `live` is the count of live
    // reviews that would actually display. Only let them take over once there
    // are enough (MIN_LIVE_REVIEWS); otherwise keep the curated manual_seed set.
    const live = rows.filter((r) => r.source === "live_api")
    const chosen = live.length >= MIN_LIVE_REVIEWS ? live : rows.filter((r) => r.source !== "live_api")

    return chosen.map((r) => ({
      author: r.author_name as string,
      rating: r.rating as number,
      text: r.review_text as string,
      relativeTime: (r.relative_time as string) ?? "",
    }))
  } catch (err) {
    console.warn("[google-reviews] read failed (table missing?):", err instanceof Error ? err.message : err)
    return []
  }
}
