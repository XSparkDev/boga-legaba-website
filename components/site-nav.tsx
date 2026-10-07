"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, Menu, X } from "lucide-react"
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
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock"
import { cn } from "@/lib/utils"

/**
 * Customer-facing navigation structure:
 *
 *   Home · Stay · Conference · Corporate · Explore Mahikeng · About · Contact · Book Now
 *
 * Secondary destinations live in submenus rather than the top level:
 *   Stay → Specials, Gallery · Conference → Dining & Events · About → FAQs
 */
interface NavChild {
  href: string
  label: string
}

interface NavLink {
  href: string
  label: string
  children?: NavChild[]
}

const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/stay", label: "Stay", children: [{ href: "/specials", label: "Specials" }, { href: "/gallery", label: "Gallery" }] },
  { href: "/conference", label: "Conference", children: [{ href: "/dining", label: "Dining & Events" }] },
  { href: "/corporate", label: "Corporate" },
  { href: "/attractions", label: "Explore Mahikeng" },
  { href: "/about", label: "About", children: [{ href: "/faqs", label: "FAQs" }] },
  { href: "/contact", label: "Contact" },
]

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
    setOpenMenu(null)
  }, [pathname])

  useEffect(() => {
    if (open) lockBodyScroll()
    else unlockBodyScroll()
    return () => unlockBodyScroll()
  }, [open])

  // Close an open submenu on Escape or a click outside the nav item.
  useEffect(() => {
    if (!openMenu) return
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (target && !target.closest("[data-nav-item]")) setOpenMenu(null)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [openMenu])

  return (
    <>
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-colors duration-300",
        scrolled
          ? "border-b border-white/10 bg-[#000000]/95 supports-[backdrop-filter]:backdrop-blur-md"
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
            const hasChildren = Boolean(link.children?.length)
            const isOpen = openMenu === link.label
            return (
              <li
                key={link.href}
                data-nav-item
                className="relative"
                onMouseEnter={() => hasChildren && setOpenMenu(link.label)}
                onMouseLeave={() => hasChildren && setOpenMenu(null)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpenMenu(null)
                }}
              >
                <Link
                  href={link.href}
                  onFocus={() => hasChildren && setOpenMenu(link.label)}
                  aria-haspopup={hasChildren ? "true" : undefined}
                  aria-expanded={hasChildren ? isOpen : undefined}
                  className={cn(
                    NAV_LINK_CLASS,
                    "relative font-body text-white/90 hover:text-white",
                    "after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:bg-gold after:transition-all after:duration-300",
                    active ? "text-white after:w-full" : "after:w-0 hover:after:w-full",
                  )}
                >
                  {link.label}
                  {hasChildren ? (
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        "ml-1 inline size-3 transition-transform duration-200",
                        isOpen && "rotate-180",
                      )}
                    />
                  ) : null}
                </Link>

                {hasChildren && isOpen && link.children ? (
                  <div className="absolute left-0 top-full z-50 min-w-[13rem] rounded-b-xl border border-white/10 bg-black/95 p-2 shadow-2xl backdrop-blur-md">
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setOpenMenu(null)}
                        className={cn(
                          "block rounded-lg px-4 py-2.5 font-body text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white",
                          pathname === child.href && "bg-white/5 text-gold",
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>

        <div className={NAV_ACTIONS_CLASS}>
          <WebsiteSwitcher variant="dark" className="hidden md:flex" />
          <Link
            href="/stay"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-gold px-3.5 py-2 font-body text-xs font-semibold text-black transition-colors hover:bg-[#c2a356] sm:px-4 xl:px-5 xl:text-sm"
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

      {open ? (
        <div
          className="fixed inset-0 top-[4.5rem] z-40 bg-[#000000] xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
        >
          <div className="flex h-[calc(100dvh-4.5rem)] flex-col overflow-y-auto overscroll-contain px-6 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
            <WebsiteSwitcherMobile variant="dark" />
            <ul className="mt-6 flex flex-col">
              {NAV_LINKS.map((link) => {
                const active = pathname === link.href
                return (
                  <li key={link.href} className="border-b border-white/10">
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "block py-4 font-display text-2xl transition-colors hover:text-gold",
                        active ? "text-gold" : "text-white/90",
                      )}
                    >
                      {link.label}
                    </Link>
                    {link.children?.length ? (
                      /* Submenu destinations are shown inline (no extra taps)
                         so mobile visitors always see Specials, Gallery,
                         Dining & Events and FAQs. */
                      <ul className="flex flex-col gap-0.5 pb-3 pl-4">
                        {link.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              onClick={() => setOpen(false)}
                              className={cn(
                                "block py-1.5 font-body text-base text-white/70 transition-colors hover:text-gold",
                                pathname === child.href && "text-gold",
                              )}
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                )
              })}
            </ul>
            <Link
              href="/stay"
              onClick={() => setOpen(false)}
              className="mt-8 inline-flex items-center justify-center rounded-full bg-gold px-6 py-3.5 font-body text-sm font-semibold text-black transition-colors hover:bg-[#c2a356]"
            >
              Book Now
            </Link>
          </div>
        </div>
      ) : null}
    </header>
    </>
  )
}
