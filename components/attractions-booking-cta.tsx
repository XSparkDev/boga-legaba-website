import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function AttractionsBookingCta() {
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
      <Link
        href="/book-now"
        data-ga4-event="book_now_click"
        className="inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-[#000000] transition-colors hover:bg-[#b8943c]"
      >
        Book Now <ArrowRight className="size-4" />
      </Link>
    </div>
  )
}
