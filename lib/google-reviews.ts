/**
 * Guest reviews shown on the home page, read from the `google_reviews` table
 * (see supabase/migrations/017_google_reviews.sql). Rows can come from two
 * sources, distinguished by the `source` column:
 *   - "manual_seed": curated by hand (current state — see the migration).
 *   - "google": reserved for a future live Google Places API sync, should
 *     that ever be enabled (see GOOGLE_PLACES_API_KEY in .env.local).
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
      .select("author_name, rating, review_text, relative_time")
      .gte("rating", 3)
      .order("id", { ascending: true })
    if (error) throw error
    return (data ?? []).map((r) => ({
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
