"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GuestReview } from "@/lib/google-reviews"

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating)
  return (
    <span className="text-gold" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(full)}
      <span className="text-[#000000]/15">{"★".repeat(5 - full)}</span>
    </span>
  )
}

function ReviewCard({ r }: { r: GuestReview }) {
  return (
    <figure className="flex h-full flex-col rounded-2xl bg-sand p-6">
      <div className="mb-3 flex items-center justify-between">
        <Stars rating={r.rating} />
        <span className="font-body text-xs text-taupe">{r.relativeTime}</span>
      </div>
      <blockquote className="font-body text-sm leading-relaxed text-body-text line-clamp-6">
        “{r.text}”
      </blockquote>
      <figcaption className="mt-4 flex items-center gap-3 border-t border-[#000000]/10 pt-4">
        <div className="flex size-8 items-center justify-center rounded-full bg-[#000000] text-xs font-semibold text-gold">
          {r.author.charAt(0).toUpperCase()}
        </div>
        <span className="font-body text-sm font-medium text-[#000000]">{r.author}</span>
      </figcaption>
    </figure>
  )
}

/**
 * Guest reviews, 3 at a time. Pagination is driven by real controls (arrows +
 * dots) rather than scroll position, so the section stays its natural height
 * and the remaining reviews are reachable in an obvious way.
 */
export function ReviewsCarousel({ reviews }: { reviews: GuestReview[] }) {
  const pages: GuestReview[][] = []
  for (let i = 0; i < reviews.length; i += 3) pages.push(reviews.slice(i, i + 3))

  const [page, setPage] = useState(0)
  const multi = pages.length > 1

  if (pages.length === 0) return null

  return (
    <div>
      {/* Viewport — natural height, no scroll-jacking, no empty space. */}
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${page * 100}%)` }}
        >
          {pages.map((group, gi) => (
            <div
              key={gi}
              aria-hidden={gi !== page}
              className="grid w-full shrink-0 grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
              {group.map((r, i) => (
                <ReviewCard key={i} r={r} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {multi ? (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label="Previous reviews"
            className="inline-flex size-9 items-center justify-center rounded-full border border-[#000000]/15 text-[#000000] transition-colors hover:bg-[#000000]/5 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="size-4" />
          </button>

          <div className="flex items-center gap-2">
            {pages.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i)}
                aria-label={`Show reviews ${i * 3 + 1}–${i * 3 + pages[i].length}`}
                aria-current={i === page}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === page ? "w-6 bg-gold" : "w-1.5 bg-[#000000]/20 hover:bg-[#000000]/35",
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pages.length - 1, p + 1))}
            disabled={page === pages.length - 1}
            aria-label="Next reviews"
            className="inline-flex size-9 items-center justify-center rounded-full border border-[#000000]/15 text-[#000000] transition-colors hover:bg-[#000000]/5 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  )
}
