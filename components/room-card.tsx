import Link from "next/link"
import type { Property, Room } from "@/data/rooms"
import { ImageOff, MessageCircle } from "lucide-react"

const NB_BBID = 21091
import { SiteImage } from "@/components/site-image"
import { formatZarPerNight, type RoomAvailabilitySummary } from "@/lib/room-availability"
import type { SyncedRoom } from "@/lib/synced-rooms"
import { LiveDataBadge } from "@/components/stay/live-data-badge"
import { cn } from "@/lib/utils"

interface RoomCardProps {
  room: Room
  property: Property
  availability?: RoomAvailabilitySummary
  checkIn?: string
  checkOut?: string
  /** Real photo of this exact room, admin-uploaded via room_images — takes
   * priority over everything else since it's guaranteed to be the actual
   * room, not a generic NightsBridge room-type stock shot. */
  realImageUrl?: string | null
  realImageTitle?: string | null
  /** Primary image URL from media_asset (NightsBridge-synced, generic per
   * room type, used only when no real photo has been uploaded yet). */
  imageUrl?: string | null
  imageAlt?: string | null
  imageFromSupabase?: boolean
  liveFromSupabase?: boolean
}

const COLOR_VARS: Record<string, string> = {
  chababa: "var(--color-chababa)",
  "interlaken-a": "var(--color-interlaken)",
  lantana: "var(--color-lantana)",
  transnet: "var(--color-transnet)",
}

function bathroomLabel(bathroom: string) {
  if (bathroom.includes("Shower") && !bathroom.includes("Bath")) return "Shower only"
  if (bathroom.includes("Bath &")) return "Bath & Shower"
  if (bathroom.includes("Bath")) return "Bath only"
  return bathroom
}

export function RoomCard({
  room,
  property,
  availability,
  checkIn,
  checkOut,
  realImageUrl,
  realImageTitle,
  imageUrl,
  imageAlt,
  imageFromSupabase,
  liveFromSupabase,
}: RoomCardProps) {
  const colorVar = COLOR_VARS[property.id] ?? property.colorHex
  const img = realImageUrl
    ? { url: realImageUrl, alt: realImageTitle || `${room.name} at ${property.name}` }
    : imageUrl
      ? { url: imageUrl, alt: imageAlt || `${room.name} at ${property.name}` }
      : null
  const synced = room as SyncedRoom
  const bbroomid = synced.bbroomid
  const bbid = synced.bbid ?? NB_BBID
  const bbrtid = synced.bbrtid ?? null

  // Prefer the NightsBridge room type name (rtname). If Supabase hasn't
  // populated room_type.rtname yet, we still pass bbrtid so the book-now
  // page can resolve the real name from the establishment API.
  const rtName = synced.roomTypeName ?? room.name

  function buildBookHref(from?: string, to?: string) {
    const p = new URLSearchParams()
    p.set("roomTypeName", rtName)
    if (from) p.set("from", from)
    if (to)   p.set("to", to)
    p.set("bbid", String(bbid))
    if (bbrtid) p.set("bbrtid", String(bbrtid))
    if (bbroomid) p.set("bbroomid", String(bbroomid))
    return `/book-now?${p.toString()}`
  }

  const bookHref = buildBookHref(checkIn, checkOut)

  const waMessage =
    checkIn && checkOut
      ? `Hi Boga Legaba, I'd like to enquire about ${room.name} at ${property.name}${bbroomid ? ` (Room ID: ${bbroomid})` : ""} for ${checkIn} to ${checkOut}.`
      : `Hi Boga Legaba, I'd like to enquire about ${room.name} at ${property.name}${bbroomid ? ` (Room ID: ${bbroomid})` : ""}.`
  const whatsapp = `https://wa.me/27828757018?text=${encodeURIComponent(waMessage)}`

  return (
    <article
      className="card-lift rounded-xl overflow-hidden bg-white flex flex-col md:flex-row group"
      data-ga4-event="room_view"
      data-ga4-label={`${property.name} – ${room.name}`}
    >
      <div className="relative md:w-[40%] h-[200px] md:h-auto md:min-h-[220px] flex-shrink-0 overflow-hidden">
        {img ? (
          <SiteImage src={img.url} alt={img.alt} fill sizes="(max-width: 768px) 100vw, 40vw" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#000000]">
            <div className="text-center">
              <ImageOff className="mx-auto mb-2 size-8 text-[#996948]/40" />
              <p className="font-body text-[11px] text-white/30">No image available</p>
            </div>
          </div>
        )}
        {availability ? (
          <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
            <div
              className={cn(
                "rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wide",
                availability.available
                  ? "bg-emerald-600 text-white"
                  : "bg-neutral-800/90 text-white",
              )}
            >
              {availability.available ? "Available" : "Booked"}
            </div>
          </div>
        ) : null}
        <div className="absolute inset-0 group-hover:bg-black/10 transition-colors duration-300 md:rounded-l-xl md:rounded-r-none pointer-events-none" />
      </div>

      <div className="flex flex-col p-6 md:p-7 flex-1">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span
            className="font-mono text-[10px] tracking-[0.12em] uppercase px-2.5 py-1 rounded-full"
            style={{ background: `${property.colorHex}1f`, color: colorVar }}
          >
            ● {property.name}
          </span>
          <span className="font-mono text-[10px] tracking-[0.1em] uppercase px-2.5 py-1 rounded-full bg-sand text-body-text">
            {room.config}
          </span>
          <span className="font-mono text-[10px] tracking-[0.1em] uppercase px-2.5 py-1 rounded-full bg-sand text-body-text">
            {bathroomLabel(room.bathroom)}
          </span>
        </div>

        <h3 className="font-display text-2xl text-[#000000] mb-2 leading-tight">{room.name}</h3>

        {synced.roomTypeName ? (
          <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-taupe">{synced.roomTypeName}</p>
        ) : null}

        {synced.maxOccupancy != null ? (
          <p className="mb-2 font-body text-xs text-muted-foreground">
            Sleeps up to {synced.maxOccupancy}
            {synced.maxAdults != null && synced.maxAdults !== synced.maxOccupancy
              ? ` (${synced.maxAdults} adults)`
              : ""}
          </p>
        ) : null}

        {availability?.available && availability.avgRate != null ? (
          <p className="mb-2 font-mono text-sm text-gold">{formatZarPerNight(availability.avgRate)}</p>
        ) : null}

        {room.description ? (
          <p className="font-body text-sm text-taupe leading-relaxed flex-1 mb-4">{room.description}</p>
        ) : (
          <div className="flex-1 mb-4" />
        )}

        {/* Item 21: give guests a direct path to the full room detail — amenities,
            meal plans (breakfast), cancellation terms and live rates — on the Book
            Now room page, so they don't have to contact the property to understand
            the room. Display-only link; reuses the existing bookHref. No booking,
            availability, or NightsBridge-integration logic is changed here. */}
        <Link
          href={bookHref}
          className="mb-5 inline-flex items-center gap-1 self-start font-body text-xs font-medium text-gold hover:underline"
        >
          Room details, amenities &amp; cancellation terms
          <span aria-hidden>→</span>
        </Link>

        <div className="space-y-2 mt-auto">
          <Link
            href={bookHref}
            data-ga4-event="book_now_click"
            className="btn-gold w-full justify-center text-sm"
          >
            {availability?.available ? "Book This Room" : "Enquire About This Room"}
          </Link>
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            data-ga4-event="whatsapp_click"
            data-ga4-label={property.name}
            className="flex items-center justify-center gap-2 font-body text-sm text-taupe hover:text-gold transition-colors duration-200 py-1"
          >
            <MessageCircle className="size-4 shrink-0" /> Enquire via WhatsApp
          </a>
        </div>
      </div>
    </article>
  )
}
