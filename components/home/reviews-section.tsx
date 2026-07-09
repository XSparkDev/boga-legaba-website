import { Reveal } from "@/components/reveal"
import { getGoogleReviews } from "@/lib/google-reviews"

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
 * Google reviews on the home page. Server component: fetches (cached) reviews
 * at render time. If there are none — API not yet enabled, cache empty — it
 * renders nothing so the page never shows an empty/broken section.
 */
export async function ReviewsSection() {
  const data = await getGoogleReviews()
  if (!data.reviews.length) return null

  // Show at most 6, longest-text first so the strongest reviews lead.
  const reviews = [...data.reviews].slice(0, 6)

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
              {data.rating != null && (
                <>
                  <span className="text-2xl font-semibold text-[#000000]">{data.rating.toFixed(1)}</span>
                  <Stars rating={data.rating} />
                </>
              )}
              {data.totalRatings != null && (
                <span className="text-sm text-taupe">
                  from {data.totalRatings.toLocaleString("en-ZA")} Google reviews
                </span>
              )}
            </div>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r, i) => (
            <Reveal key={i} delay={i * 80}>
              <figure className="flex h-full flex-col rounded-2xl border border-[#000000]/10 bg-sand p-6">
                <div className="mb-3 flex items-center justify-between">
                  <Stars rating={r.rating} />
                  <span className="font-body text-xs text-taupe">{r.relativeTime}</span>
                </div>
                <blockquote className="font-body text-sm leading-relaxed text-body-text line-clamp-6">
                  “{r.text}”
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-3 border-t border-[#000000]/10 pt-4">
                  {r.authorPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.authorPhoto} alt="" className="size-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="flex size-8 items-center justify-center rounded-full bg-[#000000] text-xs font-semibold text-gold">
                      {r.author.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-body text-sm font-medium text-[#000000]">{r.author}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
