'use client'
import { v2Path } from '@v2/lib/paths'

import Link from 'next/link'
import { ArrowRight, ArrowDown } from 'lucide-react'
import { SiteImage } from '@v2/components/site-image'
import { getSiteImage } from '@v2/data/images'

const headlineWords = ['Mahikeng\u2019s', 'Most', 'Welcoming', 'Address.']
const heroImage = getSiteImage('hero')

export function HeroSection() {
  return (
    <section className="grain-surface relative min-h-screen w-full overflow-hidden bg-cream">
      <div className="relative z-[2] grid min-h-screen grid-cols-1 lg:grid-cols-[55%_45%]">
        <div className="relative z-10 flex flex-col justify-center px-6 pb-8 pt-[calc(4.5rem+1.5rem)] sm:px-8 sm:pb-10 sm:pt-[calc(4.5rem+2rem)] md:px-12 lg:px-14 lg:pb-12 lg:pt-0 xl:pt-[calc(6rem+1rem)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-terracotta">
            Mahikeng · NW Province
          </p>

          <h1 className="mt-5 font-display text-[clamp(2.5rem,9vw,6.875rem)] font-bold leading-[0.9] text-deep-earth">
            {headlineWords.map((word, i) => (
              <span
                key={word}
                className="word-rise mr-[0.25em] italic"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                {word}
              </span>
            ))}
          </h1>

          <div className="hero-rule mt-7 h-[3px] w-[60px] bg-terracotta" />

          <p className="mt-7 max-w-md text-lg leading-relaxed text-body-brown">
            Three properties. 27 rooms. One team — looking after your stay across Mahikeng.
          </p>

          <div className="mt-7 flex w-full max-w-md flex-col gap-3 sm:mt-9 sm:max-w-none sm:flex-row sm:items-center sm:gap-4">
            <Link
              href={v2Path("/book-now")}
              data-ga4-event="book_now_click"
              data-cursor="cta"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-terracotta px-6 py-3.5 font-sans text-sm font-medium text-white transition-colors hover:bg-terracotta-light sm:w-auto sm:px-7 sm:py-4 sm:text-base"
            >
              Book Your Stay
              <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#properties"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full border border-terracotta px-6 py-3.5 font-sans text-sm font-medium text-terracotta transition-colors hover:bg-terracotta/10 sm:w-auto sm:px-7 sm:py-4 sm:text-base"
            >
              Explore Properties
              <ArrowDown className="h-4 w-4 shrink-0 transition-transform group-hover:translate-y-1" />
            </a>
          </div>

          <p className="mt-8 flex items-center justify-center gap-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] font-mono text-[10px] uppercase tracking-[0.25em] text-muted-brown sm:mt-10 sm:justify-start lg:mt-12">
            <ArrowDown className="h-3 w-3 shrink-0 animate-bounce" /> Scroll
          </p>
        </div>

        <div className="relative order-first min-h-[42vh] lg:order-last lg:min-h-screen">
          <SiteImage
            src={heroImage.src}
            alt={heroImage.alt}
            priority
            className="absolute inset-0 h-full w-full"
          />
          <div className="absolute inset-y-0 left-0 hidden w-16 bg-gradient-to-r from-cream to-transparent lg:block" />
        </div>
      </div>
    </section>
  )
}
