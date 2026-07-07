import { MessageCircle } from "lucide-react"
import { properties } from "@/data/rooms"
import { Reveal } from "@/components/reveal"

const COLOR_VARS: Record<string, string> = {
  chababa: "var(--color-chababa)",
  "interlaken-a": "var(--color-interlaken)",
  lantana: "var(--color-lantana)",
}

export function WhatsAppSection() {
  const desks = properties.filter((p) => p.id !== "transnet")

  return (
    <section className="grain relative overflow-hidden bg-[#000000] py-20 text-white lg:py-28">
      <div className="relative z-[2] mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <span className="inline-flex size-14 items-center justify-center rounded-full bg-[#996948] whatsapp-pulse">
              <MessageCircle className="size-7 text-white" />
            </span>
            <h2 className="mt-6 text-balance font-display text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              Prefer WhatsApp? So do we.
            </h2>
            <p className="mt-4 max-w-md text-pretty leading-relaxed text-white/70 font-body">
              Message us directly for fast responses, quotes, and booking assistance.
            </p>
            <p className="mt-6 font-mono text-xs uppercase tracking-wider text-white/40">
              All enquiries are tracked and attributed for faster follow-up.
            </p>
          </Reveal>

          <Reveal delay={120} className="flex flex-col gap-3">
            {desks.map((p) => (
              <a
                key={p.id}
                href={p.whatsapp}
                target="_blank"
                rel="noreferrer"
                data-ga4-event="whatsapp_click"
                data-ga4-label={p.name}
                style={{ borderLeft: `3px solid ${COLOR_VARS[p.id] ?? p.colorHex}` }}
                className="flex items-center justify-between w-full min-h-[72px] px-6 bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-250 border border-white/10 hover:border-white/20"
              >
                <span className="flex items-center gap-3">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: p.colorHex }} aria-hidden="true" />
                  <span className="flex flex-col">
                    <span className="font-body font-medium">Chat: {p.name}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-white/45">{p.code}</span>
                  </span>
                </span>
                <MessageCircle className="size-5 text-[#996948]" />
              </a>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  )
}
