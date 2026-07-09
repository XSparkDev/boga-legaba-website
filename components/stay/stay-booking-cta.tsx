import Link from "next/link"
import { CalendarRange, MessageCircle, Phone, ShieldCheck } from "lucide-react"
import { BUSINESS } from "@/data/rooms"

/**
 * Custom booking CTA — no NightsBridge iframe or embedded widgets.
 * Guests browse rooms on this site; booking is handled via our own flow.
 */
export function StayBookingCta() {
  return (
    <section className="bg-[#000000] py-16 text-white lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-gold">
            <CalendarRange className="size-3.5" /> Direct Booking
          </span>
          <h2 className="mt-4 text-balance font-display text-3xl font-bold leading-tight sm:text-4xl">
            Ready to book? Secure your room directly with our team.
          </h2>
          <p className="mt-3 flex items-center justify-center gap-2 font-body text-sm text-white/60">
            <ShieldCheck className="size-4 text-gold" /> Best rates — no OTA commission fees.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-white/10 bg-white/[0.04] p-8 sm:p-10">
          <p className="text-center font-body text-sm leading-relaxed text-white/70">
            Room availability is kept in sync with our property management system. Choose your room above,
            then contact us to confirm dates and complete your reservation.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/book-now" className="btn-gold justify-center text-sm" data-ga4-event="book_now_click">
              Start Booking
            </Link>
            <a
              href={BUSINESS.whatsappGeneral}
              target="_blank"
              rel="noreferrer"
              data-ga4-event="whatsapp_click"
              data-ga4-label="Stay booking enquiry"
              className="btn-glass justify-center text-sm"
            >
              <MessageCircle className="size-4" /> Book via WhatsApp
            </a>
            <a href={BUSINESS.phoneHref} className="btn-glass justify-center text-sm">
              <Phone className="size-4" /> Call {BUSINESS.phone}
            </a>
          </div>

          <p className="mt-6 text-center font-mono text-[10px] tracking-wide text-white/40">
            Or email{" "}
            <a href={`mailto:${BUSINESS.email}`} className="text-white/60 transition-colors hover:text-gold">
              {BUSINESS.email}
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
