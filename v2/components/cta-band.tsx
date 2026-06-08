import Link from 'next/link'
import { v2Path } from '@v2/lib/paths'
import { ArrowRight } from 'lucide-react'
import { Reveal } from './reveal'
import { waLink } from '@v2/data/site'

export function CtaBand() {
  return (
    <section className="bg-terracotta py-20 md:py-24">
      <div className="mx-auto max-w-4xl px-6 text-center md:px-8">
        <Reveal>
          <h2 className="font-display text-4xl italic font-bold leading-tight text-white text-balance md:text-6xl">
            Ready to book your stay in Mahikeng?
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <div className="mt-9 flex flex-col items-center gap-4">
            <Link
              href={v2Path("/book-now")}
              data-ga4-event="book_now_click"
              data-cursor="cta"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 font-sans font-medium text-deep-earth transition-colors hover:bg-deep-earth hover:text-white"
            >
              Book Directly Now
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href={waLink('chababa', 'Hello Boga Legaba, I would like to book a stay.')}
              target="_blank"
              rel="noopener noreferrer"
              data-ga4-event="whatsapp_click"
              data-ga4-property="chababa"
              data-cursor="whatsapp"
              className="text-sm text-white/90 underline underline-offset-4 hover:text-white"
            >
              Or chat on WhatsApp
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
