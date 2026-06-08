"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { SiteLogo } from "@/components/site-logo"
import { WebsiteSwitcher, WebsiteSwitcherMobile } from "@/components/website-switcher"
import {
  NAV_ACTIONS_CLASS,
  NAV_BAR_HEIGHT,
  NAV_INNER_CLASS,
  NAV_LINK_CLASS,
  NAV_LINKS_ROW_CLASS,
  NAV_LOGO_SLOT_CLASS,
} from "@/lib/nav-shell"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { href: "/stay", label: "Stay" },
  { href: "/conference", label: "Conference" },
  { href: "/corporate", label: "Corporate" },
  { href: "/dining", label: "Dining" },
  { href: "/attractions", label: "Attractions" },
  { href: "/specials", label: "Specials" },
  { href: "/gallery", label: "Gallery" },
  { href: "/faqs", label: "FAQs" },
  { href: "/", label: "Home" },
  { href: "/contact", label: "Contact" },
]

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-colors duration-300",
        scrolled
          ? "border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur-md"
          : "bg-transparent",
      )}
    >
      <nav className={cn(NAV_INNER_CLASS, NAV_BAR_HEIGHT)}>
        <Link href="/" className={NAV_LOGO_SLOT_CLASS} aria-label="Boga Legaba home">
          <SiteLogo size="nav" />
        </Link>

        <ul className={NAV_LINKS_ROW_CLASS}>
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    NAV_LINK_CLASS,
                    "relative font-body text-white/90 hover:text-white",
                    "after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:bg-gold after:transition-all after:duration-300",
                    active ? "text-white after:w-full" : "after:w-0 hover:after:w-full",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className={NAV_ACTIONS_CLASS}>
          <WebsiteSwitcher variant="dark" className="hidden md:flex" />
          <Link
            href="/book-now"
            data-ga4-event="book_now_click"
            className="btn-gold hidden min-w-[5.5rem] justify-center text-xs sm:inline-flex sm:text-sm"
          >
            Book Now
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-10 items-center justify-center rounded-full text-white xl:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </nav>

      <div
        className={cn(
          "fixed inset-0 top-[4.5rem] z-40 bg-[#0a0a0a] transition-all duration-300 xl:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="flex h-[calc(100vh-4.5rem)] flex-col overflow-y-auto px-6 py-8">
          <WebsiteSwitcherMobile variant="dark" />
          <ul className="mt-6 flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "block border-b border-white/10 py-4 font-display text-2xl text-white/90 transition-colors hover:text-gold",
                      active && "text-gold",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
          <Link
            href="/book-now"
            data-ga4-event="book_now_click"
            className="btn-gold mt-8 w-full justify-center text-base"
          >
            Book Now
          </Link>
        </div>
      </div>
    </header>
  )
}
