import Link from 'next/link'
import { v2Path } from '@v2/lib/paths'
import { CalendarClock, Mail, Phone } from 'lucide-react'
import { WhatsAppIcon } from '@v2/components/whatsapp-icon'
import { EMAIL, PHONE, properties, waLink } from '@v2/data/site'

const bookingProperties = properties.filter((p) => p.key !== 'transnet')

export function BookingWidget() {
  return (
    <div className="rounded-2xl border border-warm-sand/60 bg-off-white p-8 md:p-10">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-deep-earth/10 bg-cream px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-body-brown">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
          Coming soon
        </span>
        <h3 className="mt-6 font-display text-3xl font-bold italic leading-tight text-deep-earth md:text-4xl">
          Direct online booking is on the way.
        </h3>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-brown">
          We&apos;re setting up live availability and instant reservations for Chababa,
          Interlaken A and Lantana — best rates, no third-party booking fees.
        </p>
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        <a
          href={`tel:${PHONE.replace(/\s/g, '')}`}
          className="group flex flex-col items-center rounded-xl border border-warm-sand/70 bg-cream px-4 py-6 text-center transition-colors hover:border-deep-earth/20 hover:bg-white"
        >
          <Phone className="h-6 w-6 text-deep-earth" aria-hidden />
          <span className="mt-3 font-sans text-sm font-medium text-deep-earth">Call us</span>
          <span className="mt-1 text-xs text-muted-brown">{PHONE}</span>
        </a>
        <a
          href={waLink('chababa', 'Hello Boga Legaba, I would like to book a stay.')}
          target="_blank"
          rel="noopener noreferrer"
          data-ga4-event="whatsapp_click"
          data-ga4-property="chababa"
          className="group flex flex-col items-center rounded-xl border border-warm-sand/70 bg-cream px-4 py-6 text-center transition-colors hover:border-deep-earth/20 hover:bg-white"
        >
          <WhatsAppIcon className="h-6 w-6 text-[#25d366]" aria-hidden />
          <span className="mt-3 font-sans text-sm font-medium text-deep-earth">WhatsApp</span>
          <span className="mt-1 text-xs text-muted-brown">Fastest response</span>
        </a>
        <Link
          href={v2Path("/contact")}
          className="group flex flex-col items-center rounded-xl border border-warm-sand/70 bg-cream px-4 py-6 text-center transition-colors hover:border-deep-earth/20 hover:bg-white"
        >
          <Mail className="h-6 w-6 text-deep-earth" aria-hidden />
          <span className="mt-3 font-sans text-sm font-medium text-deep-earth">Email us</span>
          <span className="mt-1 text-xs text-muted-brown">{EMAIL}</span>
        </Link>
      </div>

      <div className="mt-8 border-t border-warm-sand/60 pt-8">
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-brown">
          Book now via our team
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {bookingProperties.map((p) => (
            <a
              key={p.key}
              href={waLink(p.key, `Hello Boga Legaba, I'd like to enquire about staying at ${p.name}.`)}
              target="_blank"
              rel="noopener noreferrer"
              data-ga4-event="whatsapp_click"
              data-ga4-property={p.key}
              className="rounded-full border border-warm-sand bg-cream px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-body-brown transition-colors hover:border-deep-earth/25 hover:bg-white"
            >
              {p.name}
            </a>
          ))}
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-muted-brown">
        Reception 24/7 · Every enquiry is followed up by our team.
      </p>
    </div>
  )
}
