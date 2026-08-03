"use client"

import { useEffect, useRef, useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@v2/lib/utils"
import type { GuestReview } from "@/lib/google-reviews"

function ReviewCard({ r }: { r: GuestReview }) {
  return (
    <div data-cursor="testimonial" className="card-testimonial flex h-full flex-col p-7">
      <div className="flex gap-1 text-white/80">
        {Array.from({ length: 5 }).map((_, s) => (
          <Star key={s} className={cn("h-4 w-4", s < Math.round(r.rating) ? "fill-current" : "opacity-25")} />
        ))}
      </div>
      <p className="font-quote mt-5 line-clamp-6 text-xl italic leading-relaxed text-cream">
        &ldquo;{r.text}&rdquo;
      </p>
      <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.15em] text-warm-sand/70">
        {r.author} · {r.relativeTime}
      </p>
    </div>
  )
}

/**
 * Borderless, iframe-like review carousel (v2 dark theme): first 3 reviews
 * show, then scrolling further through this section slides in the next 3.
 */
export function ReviewsCarousel({ reviews }: { reviews: GuestReview[] }) {
  const pages = [reviews.slice(0, 3), reviews.slice(3, 6)].filter((p) => p.length > 0)
  const sectionRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)

  useEffect(() => {
    if (pages.length <= 1) return
    function onScroll() {
      const el = sectionRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const total = rect.height - window.innerHeight
      if (total <= 0) return
      const progress = Math.min(1, Math.max(0, -rect.top / total))
      setPage(progress < 0.5 ? 0 : 1)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages.length])

  if (pages.length <= 1) {
    return (
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {(pages[0] ?? []).map((r, i) => (
          <div key={i} className="h-full rounded-2xl bg-white/[0.06]">
            <ReviewCard r={r} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div ref={sectionRef} style={{ height: "200vh" }} className="relative mt-10">
      <div className="sticky top-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white/[0.06]">
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${page * 100}%)` }}
        >
          {pages.map((group, gi) => (
            <div key={gi} className="grid w-full shrink-0 grid-cols-1 divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
              {group.map((r, i) => (
                <ReviewCard key={i} r={r} />
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 pb-5">
          {pages.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === page ? "w-6 bg-warm-sand" : "w-1.5 bg-white/15",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
