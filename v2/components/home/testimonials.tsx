import { Reveal } from '@v2/components/reveal'
import { ReviewsCarousel } from '@v2/components/home/reviews-carousel'
import { getGuestReviews } from '@/lib/google-reviews'

/**
 * Real guest reviews (same source as the main site's home page), capped to 6.
 * Server component: renders nothing if there are no reviews yet, rather than
 * ever showing fabricated placeholder quotes.
 */
export async function Testimonials() {
  const reviews = (await getGuestReviews()).slice(0, 6)
  if (!reviews.length) return null

  return (
    <section className="bg-deep-earth py-20 md:py-28">
      <div className="diagonal-texture mx-auto max-w-7xl px-6 md:px-8">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/70">
            What Guests Say
          </p>
        </Reveal>
        <Reveal>
          <ReviewsCarousel reviews={reviews} />
        </Reveal>
      </div>
    </section>
  )
}
