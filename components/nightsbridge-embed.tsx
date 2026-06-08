import Link from "next/link"
import { CalendarRange, MessageCircle, Phone, ShieldCheck } from "lucide-react"
import { BUSINESS } from "@/data/rooms"

interface NightsBridgeEmbedProps {
  heading?: string
  note?: string
}

/**
 * ===========================================================================
 * NIGHTSBRIDGE BOOKING ENGINE — EMBED POINT
 * ---------------------------------------------------------------------------
 * When NightsBridge credentials are ready, replace the interim panel below
 * with the live widget. Example:
 *
 *   <iframe
 *     src="https://book.nightsbridge.com/XXXXX"
 *     title="Boga Legaba — NightsBridge Booking Engine"
 *     className="h-[720px] w-full border-0"
 *   />
 *
 * Track conversions with the `book_now_click` GA4 event.
 * ===========================================================================
 */
export function NightsBridgeEmbed({
  heading = "Ready to book? Secure your room directly below.",
  note = "Booking directly avoids OTA commission fees and guarantees best rates.",
}: NightsBridgeEmbedProps) {
  return (
    <section className="bg-[#0a0a0a] py-16 text-white lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-gold">
            <CalendarRange className="size-3.5" /> Direct Booking
          </span>
          <h2 className="mt-4 text-balance font-display text-3xl font-bold leading-tight sm:text-4xl">{heading}</h2>
          <p className="mt-3 flex items-center justify-center gap-2 text-sm text-white/60 font-body">
            <ShieldCheck className="size-4 text-gold" /> {note}
          </p>
        </div>

        {/* Interim panel — replace with NightsBridge iframe when ready */}
        <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-white/10 bg-white/[0.04] p-8 sm:p-10">
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
            Online calendar — coming soon
          </p>
          <p className="mt-4 text-center text-pretty text-sm leading-relaxed text-white/70 font-body">
            Our NightsBridge booking engine is being connected. In the meantime, book directly with our team — same
            rates, no agent fees, fast confirmation.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href={BUSINESS.whatsappGeneral}
              target="_blank"
              rel="noreferrer"
              data-ga4-event="whatsapp_click"
              data-ga4-label="Booking enquiry"
              className="btn-gold justify-center text-sm"
            >
              <MessageCircle className="size-4" /> Book via WhatsApp
            </a>
            <a href={BUSINESS.phoneHref} className="btn-glass justify-center text-sm">
              <Phone className="size-4" /> Call {BUSINESS.phone}
            </a>
          </div>

          <p className="mt-6 text-center font-mono text-[10px] tracking-wide text-white/40">
            Or email{" "}
            <a href={`mailto:${BUSINESS.email}`} className="text-white/60 hover:text-gold transition-colors">
              {BUSINESS.email}
            </a>
          </p>
        </div>

        <p className="mx-auto mt-6 max-w-md text-center text-xs text-white/40 font-body">
          Choose your property on the{" "}
          <Link href="/stay" className="text-gold hover:underline">
            Stay page
          </Link>{" "}
          to confirm the correct arrival address before booking.
        </p>
      </div>
    </section>
  )
}
