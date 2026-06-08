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
import {
  NAV_ACTIONS_CLASS,
  NAV_BAR_HEIGHT,
  NAV_INNER_CLASS,
  NAV_LINK_CLASS,
  NAV_LINKS_ROW_CLASS,
  NAV_LOGO_SLOT_CLASS,
} from '@/lib/nav-shell'
import { cn } from '@v2/lib/utils'

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const isHome = pathname === V2_PREFIX
  // Pages with a cream/light hero need dark nav text; dark-hero pages use light text at the top.
  const isLightTopHero = isHome || pathname === v2Path('/dining')
  const useLightChrome = scrolled || isLightTopHero
  const solidHeader = scrolled || (isLightTopHero && !isHome)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
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
          'fixed top-0 left-0 right-0 z-50 overflow-hidden transition-colors duration-300',
          NAV_BAR_HEIGHT,
          solidHeader
            ? 'border-b border-warm-sand/50 bg-cream/95 backdrop-blur-md'
            : 'bg-transparent',
        )}
      >
        <nav className={cn(NAV_INNER_CLASS, NAV_BAR_HEIGHT)}>
          <Link
            href={v2Path('/')}
            className={NAV_LOGO_SLOT_CLASS}
            aria-label="Boga Legaba home"
            data-cursor="nav"
          >
            <SiteLogo variant={useLightChrome ? 'dark' : 'light'} priority />
          </Link>

          <div className={NAV_LINKS_ROW_CLASS}>
            {navLinks.map((l) => {
              const active = pathname === l.href
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  data-cursor="nav"
                  className={cn(
                    NAV_LINK_CLASS,
                    'relative font-sans hover:text-terracotta',
                    active && 'text-terracotta',
                    !active &&
                      (useLightChrome
                        ? 'text-body-brown'
                        : 'text-cream/95 [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]'),
                    active
                      ? 'after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-full after:bg-terracotta'
                      : 'after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-terracotta after:transition-all after:duration-300 hover:after:w-full',
                  )}
                >
                  {l.label}
                </Link>
              )
            })}
          </div>

          <div className={NAV_ACTIONS_CLASS}>
            <WebsiteSwitcher
              variant={useLightChrome ? 'light' : 'dark'}
              className="hidden md:flex"
            />
            <Link
              href={v2Path('/book-now')}
              data-ga4-event="book_now_click"
              data-cursor="cta"
              className="hidden min-w-[5.5rem] shrink-0 items-center justify-center rounded-full bg-terracotta px-3 py-2 text-center text-xs font-medium text-white transition-colors hover:bg-terracotta-light sm:inline-flex sm:text-sm"
            >
              Book Now
            </Link>
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              className={cn(
                'inline-flex size-10 items-center justify-center rounded-full transition-colors xl:hidden',
                useLightChrome
                  ? 'text-deep-earth hover:bg-warm-sand'
                  : 'text-cream hover:bg-white/10',
              )}
            >
              <Menu className="size-6" />
            </button>
          </div>
        </nav>
      </header>

      <div
        className={cn(
          'fixed inset-0 z-[60] flex flex-col bg-deep-earth transition-all duration-300 xl:hidden',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
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
            className="flex size-10 items-center justify-center rounded-full text-white hover:bg-white/10"
          >
            <X className="size-6" />
          </button>
        </div>
        <nav className="flex min-h-0 flex-1 flex-col justify-start gap-1 overflow-y-auto overscroll-contain px-6 py-6 pb-16">
          <WebsiteSwitcherMobile variant="dark" />
          {navLinks.concat([{ href: v2Path('/book-now'), label: 'Book Now' }]).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              data-cursor="nav"
              onClick={() => setOpen(false)}
              className="font-display text-3xl italic text-white sm:text-4xl"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  )
}
