import { NextResponse } from "next/server"
import { getGuestReviews, OVERALL_RATING, OVERALL_REVIEW_COUNT } from "@/lib/google-reviews"

export const dynamic = "force-dynamic"

/**
 * GET /api/reviews — public, read-only.
 *
 * Returns the guest reviews shown on the site. The selection logic lives in
 * getGuestReviews(): reviews below 3 stars are excluded, and "live_api" rows
 * are preferred over "manual_seed" rows once a live sync has run. The same
 * function backs the home-page ReviewsSection, so the API and the page can
 * never drift out of sync.
 */
export async function GET() {
  const reviews = await getGuestReviews()
  return NextResponse.json({
    rating: OVERALL_RATING,
    reviewCount: OVERALL_REVIEW_COUNT,
    reviews,
  })
}
