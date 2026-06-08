'use client'
import { v2Path } from '@v2/lib/paths'

import Link from 'next/link'
import { useRef } from 'react'
import { ArrowRight, ArrowDown } from 'lucide-react'
import { SiteImage } from '@v2/components/site-image'
import { getSiteImage } from '@v2/data/images'

const headlineWords = ['Mahikeng\u2019s', 'Most', 'Welcoming', 'Address.']
const heroImage = getSiteImage('hero')

export function HeroSection() {
  const parallaxRef = useRef<HTMLDivElement>(null)

  function handleHeroMove(e: React.MouseEvent<HTMLElement>) {
    const panel = parallaxRef.current
    if (!panel || window.matchMedia('(pointer: coarse)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const rect = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    const max = 22
    panel.style.transform = `translate(${px * max}px, ${py * max}px)`
  }

  function resetHeroMove() {
    if (parallaxRef.current) parallaxRef.current.style.transform = ''
  }

  return (
    <section
      className="grain-surface relative min-h-screen w-full overflow-hidden bg-cream"
      onMouseMove={handleHeroMove}
      onMouseLeave={resetHeroMove}
    >
      <div className="relative z-[2] grid min-h-screen grid-cols-1 lg:grid-cols-[55%_45%]">
        <div className="relative z-10 flex flex-col justify-center px-6 pb-12 pt-36 md:px-12 md:pt-32 lg:pt-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-terracotta">
            Mahikeng · NW Province
          </p>

          <h1 className="mt-5 font-display text-[clamp(56px,9vw,110px)] font-bold leading-[0.88] text-deep-earth">
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

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={v2Path("/book-now")}
              data-ga4-event="book_now_click"
              data-cursor="cta"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-terracotta px-7 py-4 font-sans font-medium text-white transition-colors hover:bg-terracotta-light"
            >
              Book Your Stay
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#properties"
              className="group inline-flex items-center justify-center gap-2 rounded-full border border-terracotta px-7 py-4 font-sans font-medium text-terracotta transition-colors hover:bg-terracotta/10"
            >
              Explore Properties
              <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-1" />
            </a>
          </div>

          <p className="mt-12 hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-brown lg:flex">
            <ArrowDown className="h-3 w-3 animate-bounce" /> Scroll
          </p>
        </div>

        <div className="relative order-first min-h-[42vh] lg:order-last lg:min-h-screen">
          <div ref={parallaxRef} className="hero-parallax-panel absolute inset-0 h-full w-full">
            <SiteImage
              src={heroImage.src}
              alt={heroImage.alt}
              priority
              className="card-property-image absolute inset-0 h-full w-full"
            />
          </div>
          <div className="absolute inset-y-0 left-0 hidden w-16 bg-gradient-to-r from-cream to-transparent lg:block" />
        </div>
      </div>
    </section>
  )
}
