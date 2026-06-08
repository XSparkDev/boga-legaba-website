import Link from 'next/link'
import { v2Path } from '@v2/lib/paths'
import { SiteImage } from '@v2/components/site-image'
import { WhatsAppIcon } from '@v2/components/whatsapp-icon'
import { getRoomImage } from '@v2/data/images'
import type { Room } from '@v2/data/rooms'
import { waLink } from '@v2/data/site'

export function RoomCard({ room }: { room: Room }) {
  const slug = room.name.toLowerCase().replace(/\s+/g, '-')
  const image = getRoomImage(room.name)

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl bg-off-white shadow-[0_4px_24px_rgba(44,26,14,0.08)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_12px_40px_rgba(44,26,14,0.18)]">
      <SiteImage src={image.src} alt={image.alt} className="h-[220px] w-full">
        <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-deep-earth/60 to-transparent" />
      </SiteImage>
      <div className="pattern-stripe opacity-40" />

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.15em]"
            style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--deep-earth)' }}
          >
            {room.configuration}
          </span>
          <span className="rounded-full bg-warm-sand px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.15em] text-body-brown">
            {room.bathroom}
          </span>
        </div>

        <h3 className="font-display text-[22px] italic leading-tight text-deep-earth">
          {room.name}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-brown">
          {room.configuration === 'TBC'
            ? 'Room details confirmed at booking. Enquire for availability.'
            : `A comfortable ${room.configuration.toLowerCase()} room with ${room.bathroom.toLowerCase()} facilities.`}
        </p>

        <Link
          href={v2Path("/book-now")}
          data-ga4-event="book_now_click"
          data-ga4-room={slug}
          className="mt-4 mb-2 w-full rounded-xl bg-terracotta py-3 text-center font-sans text-sm font-medium text-white transition-colors hover:bg-terracotta-light"
        >
          Book This Room →
        </Link>
        <a
          href={waLink(room.property, `I'd like to enquire about the ${room.name} room.`)}
          target="_blank"
          rel="noopener noreferrer"
          data-ga4-event="whatsapp_click"
          data-ga4-room={slug}
          data-ga4-property={room.property}
          className="flex items-center justify-center gap-2 py-1 text-sm text-muted-brown transition-colors hover:text-terracotta"
        >
          <WhatsAppIcon className="h-4 w-4 text-[#25d366]" />
          Enquire via WhatsApp
        </a>
      </div>
    </div>
  )
}
