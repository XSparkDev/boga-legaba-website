"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { NightsBridgeModal } from "@/components/NightsBridgeModal"
import { SiteLogo } from "@/components/site-logo"
import { SiteImage } from "@/components/site-image"
import { useBookingModal } from "@/hooks/useBookingModal"
import { getSiteImage } from "@/lib/site-images"

export function HomeHero() {
  const hero = getSiteImage("hero")
  const { isOpen, openModal, closeModal } = useBookingModal()

  return (
    <section className="grain relative flex min-h-[100svh] flex-col overflow-x-clip">
      <SiteImage
        src={hero.url}
        alt={hero.alt}
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.4) 55%, rgba(0,0,0,0.15) 100%)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

      <div className="relative z-[2] mx-auto flex w-full max-w-7xl flex-1 flex-col justify-start px-4 pb-8 pt-[calc(4.5rem+1rem)] sm:justify-center sm:px-6 sm:pb-10 sm:pt-[calc(4.5rem+1.75rem)] xl:px-8 xl:pt-[calc(6rem+2rem)]">
        <div className="max-w-3xl">
          <SiteLogo size="hero" className="mb-3 hidden sm:mb-8 sm:block" />
          <p className="font-mono text-[11px] tracking-[0.2em] text-gold uppercase">
            Mahikeng · North West Province
          </p>
          <div className="my-3 h-[2px] w-[60px] bg-gold sm:my-4" />
          <h1 className="heading-hero text-balance font-bold">
            Where Business Travel Meets African Hospitality
          </h1>
          <p className="mt-5 max-w-xl text-pretty font-body text-base leading-relaxed text-white/75 sm:mt-7 sm:text-lg">
            Three unique properties. One seamless experience. Mahikeng&apos;s premier guest house and conference
            destination.
          </p>
          <div className="mt-7 space-y-6 sm:mt-9 sm:space-y-8">
            <div className="flex w-full max-w-xl flex-col gap-3 sm:max-w-2xl sm:flex-row sm:items-stretch">
              <Link
                href="/stay"
                data-ga4-event="book_now_click"
                className="btn-gold flex min-h-[3rem] w-full flex-1 items-center justify-center gap-2 border border-transparent px-5 py-3.5 text-center text-sm font-medium sm:px-6"
              >
                Book Your Stay <ArrowRight className="size-4 shrink-0" />
              </Link>
              <Link
                href="/conference"
                className="btn-glass flex min-h-[3rem] w-full flex-1 items-center justify-center px-5 py-3.5 text-center text-sm font-medium sm:px-6"
              >
                Enquire About Conferences
              </Link>
            </div>

            <div
              className="flex flex-col items-center gap-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] sm:items-start"
              aria-hidden
            >
              <span className="font-mono text-[10px] tracking-[0.15em] text-gold uppercase">Scroll</span>
              <div className="h-8 w-px bg-gold/60 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
      <NightsBridgeModal isOpen={isOpen} onClose={closeModal} />
    </section>
  )
}
