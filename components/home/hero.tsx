import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SiteLogo } from "@/components/site-logo"
import { SiteImage } from "@/components/site-image"
import { getSiteImage } from "@/lib/site-images"

export function HomeHero() {
  const hero = getSiteImage("hero")

  return (
    <section className="grain relative flex min-h-[100svh] items-center overflow-hidden">
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

      <div className="relative z-[2] mx-auto w-full max-w-7xl px-4 pt-24 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <SiteLogo size="hero" className="mb-6 sm:mb-8" />
          <p className="font-mono text-[11px] tracking-[0.2em] text-gold uppercase">
            Mahikeng · North West Province
          </p>
          <div className="w-[60px] h-[2px] bg-gold my-4" />
          <h1 className="heading-hero text-balance font-bold">
            Where Business Travel Meets African Hospitality
          </h1>
          <p className="mt-7 max-w-xl text-pretty text-base leading-relaxed text-white/75 sm:text-lg font-body">
            Three unique properties. One seamless experience. Mahikeng&apos;s premier guest house and conference
            destination.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/book-now"
              data-ga4-event="book_now_click"
              className="btn-gold text-sm"
            >
              Book Your Stay <ArrowRight className="size-4" />
            </Link>
            <Link href="/conference" className="btn-glass text-sm">
              Enquire About Conferences
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[2] flex flex-col items-center gap-2">
        <span className="font-mono text-[10px] tracking-[0.15em] text-gold uppercase">Scroll</span>
        <div className="w-[1px] h-8 bg-gold/60 animate-pulse" />
      </div>
    </section>
  )
}
