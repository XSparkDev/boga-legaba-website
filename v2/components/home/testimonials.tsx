import { Star } from 'lucide-react'
import { Reveal } from '@v2/components/reveal'

const reviews = [
  {
    quote:
      'Excellent facilities for our government delegation. Professional, responsive, and great value.',
    name: 'M. Dlamini',
    org: 'Department of Health',
  },
  {
    quote:
      'Booking was seamless and the WhatsApp desk made coordinating our team so easy. Highly recommend.',
    name: 'T. Mokoena',
    org: 'North West Provincial Office',
  },
  {
    quote:
      'Comfortable rooms, reliable invoicing for our PO process, and a venue that handled our full-day conference flawlessly.',
    name: 'R. van Wyk',
    org: 'Transnet SOC',
  },
]

export function Testimonials() {
  return (
    <section className="bg-deep-earth py-20 md:py-28">
      <div className="diagonal-texture mx-auto max-w-7xl px-6 md:px-8">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/70">
            What Guests Say
          </p>
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {reviews.map((r, i) => (
            <Reveal key={r.name} delay={i * 100}>
              <div
                data-cursor="testimonial"
                className="card-testimonial h-full rounded-2xl bg-white/[0.06] p-7"
              >
                <div className="flex gap-1 text-white/80">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="font-quote mt-5 text-xl italic leading-relaxed text-cream">
                  &ldquo;{r.quote}&rdquo;
                </p>
                <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.15em] text-warm-sand/70">
                  {r.name} · {r.org}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
