import { Reveal } from "@/components/reveal"
import { ReviewsCarousel } from "@/components/home/reviews-carousel"
import { getGuestReviews, OVERALL_RATING, OVERALL_REVIEW_COUNT } from "@/lib/google-reviews"

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating)
  return (
    <span className="text-gold" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(full)}
      <span className="text-[#000000]/15">{"★".repeat(5 - full)}</span>
    </span>
  )
}

/**
 * Guest reviews on the home page. Server component: reads (rating >= 3)
 * reviews from the DB at render time, capped to 6 (Google's own Places API
 * never returns more than 5 reviews for a listing anyway). If there are none,
 * it renders nothing so the page never shows an empty/broken section.
 */
export async function ReviewsSection() {
  const allReviews = await getGuestReviews()
  const reviews = allReviews.slice(0, 6)
  if (!reviews.length) return null

  return (
    <section className="section-padding bg-white">
      <div className="container mx-auto px-6 max-w-7xl">
        <Reveal>
          <div className="mb-12 text-center">
            <span className="section-label">Guest Reviews</span>
            <h2 className="font-display text-[clamp(36px,5vw,56px)] leading-[0.95] tracking-[-0.02em] text-[#000000] mb-4">
              What our guests say
            </h2>
            <div className="flex items-center justify-center gap-3 font-body text-body-text">
              <span className="text-2xl font-semibold text-[#000000]">{OVERALL_RATING.toFixed(1)}</span>
              <Stars rating={OVERALL_RATING} />
              <span className="text-sm text-taupe">
                from {OVERALL_REVIEW_COUNT.toLocaleString("en-ZA")} reviews
              </span>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <ReviewsCarousel reviews={reviews} />
        </Reveal>
      </div>
    </section>
  )
}
