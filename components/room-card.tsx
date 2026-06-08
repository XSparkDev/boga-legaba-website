import Link from "next/link"
import type { Property, Room } from "@/data/rooms"
import { SiteImage } from "@/components/site-image"
import { getRoomImage } from "@/lib/site-images"

interface RoomCardProps {
  room: Room
  property: Property
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

export function RoomCard({ room, property }: RoomCardProps) {
  const colorVar = COLOR_VARS[property.id] ?? property.colorHex
  const img = getRoomImage(property.id, room.name, property.name)

  return (
    <article
      className="card-lift rounded-xl overflow-hidden bg-white flex flex-col md:flex-row group"
      data-ga4-event="room_view"
      data-ga4-label={`${property.name} – ${room.name}`}
    >
      <div className="relative md:w-[40%] h-[200px] md:h-auto md:min-h-[220px] flex-shrink-0 overflow-hidden">
        <SiteImage src={img.url} alt={img.alt} fill sizes="(max-width: 768px) 100vw, 40vw" />
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
            {bathroomEmoji(room.bathroom)}
          </span>
        </div>

        <h3 className="font-display text-2xl text-[#0A0A0A] mb-2 leading-tight">{room.name}</h3>

        <p className="font-body text-sm text-taupe leading-relaxed flex-1 mb-5">{room.description}</p>

        <div className="space-y-2 mt-auto">
          <Link
            href="/book-now"
            data-ga4-event="book_now_click"
            className="btn-gold w-full justify-center text-sm"
          >
            Book This Room
          </Link>
          <a
            href={property.whatsapp}
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
