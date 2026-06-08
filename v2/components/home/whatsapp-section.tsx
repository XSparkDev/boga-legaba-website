import { Reveal } from '@v2/components/reveal'
import { WhatsAppIcon } from '@v2/components/whatsapp-icon'
import { properties, waLink } from '@v2/data/site'

export function WhatsAppSection() {
  return (
    <section className="bg-deep-earth py-20 md:py-28">
      <div className="diagonal-texture mx-auto grid max-w-7xl gap-12 px-6 md:px-8 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <div data-cursor="whatsapp">
            <WhatsAppIcon className="h-16 w-16 text-white" />
            <h2 className="mt-6 font-display text-4xl font-light leading-tight text-white md:text-5xl">
              Prefer to chat?
              <br />
              <span className="italic text-white/90">We&apos;re always on WhatsApp.</span>
            </h2>
            <p className="mt-6 font-mono text-[11px] uppercase leading-relaxed tracking-[0.2em] text-warm-sand/70">
              Direct line to each property team.
              <br />
              All enquiries tracked &amp; followed up.
            </p>
          </div>
        </Reveal>

        <div className="flex flex-col gap-3">
          {properties
            .filter((p) => p.key !== 'transnet')
            .map((p, i) => (
              <Reveal key={p.key} delay={i * 100}>
                <a
                  href={waLink(p.key, `Hello Boga Legaba, I'd like to enquire about ${p.name}.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-ga4-event="whatsapp_click"
                  data-ga4-property={p.key}
                  data-cursor="whatsapp"
                  className="card-whatsapp-prop group flex items-center justify-between rounded-xl bg-white/[0.08] p-5 transition-all duration-300 hover:bg-cream hover:text-deep-earth"
                  style={{ borderLeft: `4px solid ${p.color}` }}
                >
                  <div>
                    <p className="font-mono text-sm tracking-widest" style={{ color: p.color }}>
                      {p.name.toUpperCase()}
                    </p>
                    <p className="mt-1 font-mono text-xs text-white/50 group-hover:text-body-brown">
                      {p.address.toUpperCase()}
                    </p>
                  </div>
                  <WhatsAppIcon className="h-6 w-6 text-[#25d366]" />
                </a>
              </Reveal>
            ))}
        </div>
      </div>
    </section>
  )
}
