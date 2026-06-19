import Link from "next/link"
import type { Property, Room } from "@/data/rooms"
import { BUSINESS } from "@/data/rooms"
import { SiteImage } from "@/components/site-image"
import { getRoomImage } from "@/lib/site-images"
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
  /** Primary image URL from media_asset */
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

function bathroomEmoji(bathroom: string) {
  if (bathroom.includes("Shower")) return "🚿 Shower only"
  if (bathroom.includes("Bath &")) return "🛁 Bath & Shower"
  if (bathroom.includes("Bath")) return "🛁 Bath only"
  return bathroom
}

export function RoomCard({
  room,
  property,
  availability,
  checkIn,
  checkOut,
  imageUrl,
  imageAlt,
  imageFromSupabase,
  liveFromSupabase,
}: RoomCardProps) {
  const colorVar = COLOR_VARS[property.id] ?? property.colorHex
  const fallback = getRoomImage(property.id, room.name, property.name)
  const img = {
    url: imageUrl || fallback.url,
    alt: imageAlt || fallback.alt,
  }
  const synced = room as SyncedRoom
  const whatsapp = property.whatsapp || BUSINESS.whatsappGeneral

  const bookHref =
    checkIn && checkOut
      ? `/book-now?room=${encodeURIComponent(room.name)}&property=${encodeURIComponent(property.name)}&from=${checkIn}&to=${checkOut}`
      : "/book-now"

  return (
    <article
      className="card-lift rounded-xl overflow-hidden bg-white flex flex-col md:flex-row group"
      data-ga4-event="room_view"
      data-ga4-label={`${property.name} – ${room.name}`}
    >
      <div className="relative md:w-[40%] h-[200px] md:h-auto md:min-h-[220px] flex-shrink-0 overflow-hidden">
        <SiteImage src={img.url} alt={img.alt} fill sizes="(max-width: 768px) 100vw, 40vw" />
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
            <LiveDataBadge label="Avail · DB" className="bg-white/95 text-[8px] shadow-sm" pulse={false} />
          </div>
        ) : null}
        {imageFromSupabase ? (
          <div className="absolute right-3 top-3 z-10">
            <LiveDataBadge label="Photo · DB" className="bg-white/95 text-[8px] shadow-sm" pulse={false} />
          </div>
        ) : null}
        <div className="absolute inset-0 group-hover:bg-black/10 transition-colors duration-300 md:rounded-l-xl md:rounded-r-none pointer-events-none" />
      </div>

      <div className="flex flex-col p-6 md:p-7 flex-1">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {liveFromSupabase ? (
            <LiveDataBadge label="Room · DB" className="text-[8px]" pulse={false} />
          ) : null}
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
            {bathroomEmoji(room.bathroom)}
          </span>
        </div>

        <h3 className="font-display text-2xl text-[#0A0A0A] mb-2 leading-tight">{room.name}</h3>

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
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="font-mono text-sm text-gold">{formatZarPerNight(availability.avgRate)}</p>
            <LiveDataBadge label="Rate · DB" className="text-[8px]" pulse={false} />
          </div>
        ) : null}

        {room.description ? (
          <p className="font-body text-sm text-taupe leading-relaxed flex-1 mb-5">{room.description}</p>
        ) : (
          <div className="flex-1 mb-5" />
        )}

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
            <span className="text-base">💬</span> Enquire via WhatsApp
          </a>
        </div>
      </div>
    </article>
  )
}
