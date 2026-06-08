'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { navLinks } from '@v2/data/site'
import { SiteLogo } from '@v2/components/site-logo'
import { WebsiteSwitcher, WebsiteSwitcherMobile } from '@/components/website-switcher'
import { V2_PREFIX } from '@/lib/website-sites'
import { v2Path } from '@v2/lib/paths'
import { cn } from '@v2/lib/utils'

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false)
  const [deepScroll, setDeepScroll] = useState(false)
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const isHome = pathname === V2_PREFIX
  const lightHero = isHome && !scrolled

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 60)
      setDeepScroll(y > 280)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <header
        className={cn(
          'nav-pill fixed z-50',
          scrolled
            ? cn(
                'left-1/2 top-3 w-[min(1280px,calc(100%-1.5rem))] -translate-x-1/2 rounded-full bg-cream/95 px-4 py-3 backdrop-blur-md sm:px-5',
                deepScroll ? 'nav-pill--scrolled-deep' : 'nav-pill--scrolled'
              )
            : 'left-0 top-0 w-full bg-transparent px-5 py-4 md:px-8 md:py-5'
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <Link href={v2Path('/')} className="shrink-0" data-cursor="nav">
            <SiteLogo
              variant={scrolled || lightHero ? 'dark' : 'light'}
              priority
            />
          </Link>

          <nav className="no-scrollbar hidden min-w-0 flex-1 items-center justify-center gap-2 overflow-x-auto px-1 lg:flex xl:gap-3">
            {navLinks.map((l) => {
              const active = pathname === l.href
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  data-cursor="nav"
                  className={cn(
                    'shrink-0 whitespace-nowrap font-sans text-xs transition-colors hover:text-terracotta xl:text-sm',
                    active && 'text-terracotta',
                    !active &&
                      (scrolled || lightHero ? 'text-body-brown' : 'text-cream/90')
                  )}
                >
                  {l.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <WebsiteSwitcher
              variant={scrolled || lightHero ? 'light' : 'dark'}
              className="hidden md:flex"
            />
            <Link
              href={v2Path('/book-now')}
              data-ga4-event="book_now_click"
              data-cursor="cta"
              className="hidden shrink-0 rounded-full bg-terracotta px-4 py-2 font-sans text-xs font-medium text-white transition-colors hover:bg-terracotta-light xl:inline-block xl:px-5 xl:py-2.5 xl:text-sm"
            >
              Book Now
            </Link>
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full transition-colors lg:hidden',
                scrolled || lightHero
                  ? 'text-deep-earth hover:bg-warm-sand'
                  : 'text-cream hover:bg-white/10'
              )}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      <div
        className={cn(
          'fixed inset-0 z-[60] flex flex-col bg-deep-earth transition-all duration-400 lg:hidden',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Link href={v2Path('/')} onClick={() => setOpen(false)}>
            <SiteLogo variant="light" />
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col justify-center gap-2 px-6 pb-16">
          <WebsiteSwitcherMobile variant="dark" />
          {navLinks.concat([{ href: v2Path('/book-now'), label: 'Book Now' }]).map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              data-cursor="nav"
              style={{
                animationDelay: `${i * 50}ms`,
                animation: open ? 'word-rise 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none',
              }}
              className="font-display text-4xl italic text-white opacity-0"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  )
}
