"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { StayDateSearch } from "@/components/stay/stay-date-search"
import { useAvailability } from "@/hooks/useAvailability"
import { NAV_STICKY_TOP_CLASS } from "@/lib/nav-shell"
import { defaultCheckInOut } from "@/lib/room-availability"
import { cn } from "@/lib/utils"

/** Tallest fixed-nav height (xl: h-24) — the bar docks the moment the hero copy reaches it. */
const NAV_HEIGHT_PX = 96

export function HomeAvailabilityWidget() {
  const availability = useAvailability()
  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [scrolledPast, setScrolledPast] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const heroCardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    const defaults = defaultCheckInOut()
    setCheckIn(defaults.checkIn)
    setCheckOut(defaults.checkOut)
  }, [])

  // The bar takes over the instant the hero copy reaches the nav — from there on
  // the hero copy is hidden (its space is kept, so nothing reflows) and the two
  // are never on screen together.
  useEffect(() => {
    const measure = () => {
      const card = heroCardRef.current
      if (card) setScrolledPast(card.getBoundingClientRect().top <= NAV_HEIGHT_PX)
    }
    measure()
    window.addEventListener("scroll", measure, { passive: true })
    window.addEventListener("resize", measure, { passive: true })
    return () => {
      window.removeEventListener("scroll", measure)
      window.removeEventListener("resize", measure)
    }
  }, [])

  function handleSearch() {
    availability.search(checkIn, checkOut)
  }

  function handleClear() {
    availability.clear()
    const defaults = defaultCheckInOut()
    setCheckIn(defaults.checkIn)
    setCheckOut(defaults.checkOut)
  }

  // Closing lasts for this page view only — deliberately NOT persisted. A guest
  // who dismissed it once should not lose the search for their whole visit with
  // no way to get it back.
  function handleClose() {
    setDismissed(true)
  }

  const floating = mounted && scrolledPast && !dismissed

  const availableCount = availability.searched
    ? Array.from(availability.byRoom.values()).filter((s) => s.available).length
    : undefined

  const shared = {
    checkIn,
    checkOut,
    onCheckInChange: setCheckIn,
    onCheckOutChange: setCheckOut,
    onSearch: handleSearch,
    onClear: handleClear,
    loading: availability.loading,
    searched: availability.searched,
    availableCount,
  }

  return (
    <div ref={heroCardRef} className="relative w-full">
      <StayDateSearch
        {...shared}
        subtextClassName="text-white"
        className={cn(
          "rounded-2xl border-[rgba(255,255,255,0.6)] bg-[rgba(255,255,255,0.12)]",
          // Hidden rather than unmounted: the hero keeps its height, so docking
          // the bar never shifts the page under the guest's finger.
          floating && "invisible",
        )}
      />

      {/* Portalled to the body so the hero's stacking/clip context can't trap it.
          z-40 keeps it under the nav (z-50) and under the open mobile menu. */}
      {mounted
        ? createPortal(
            <div
              aria-hidden={!floating}
              className={cn(
                "fixed inset-x-0 z-40 border-b border-white/10 bg-[#000000]/95 px-4 py-3.5 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.9)] transition-all duration-300 ease-out supports-[backdrop-filter]:backdrop-blur-md sm:px-6 xl:px-8",
                NAV_STICKY_TOP_CLASS,
                floating ? "translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-3 opacity-0",
              )}
            >
              <div className="mx-auto flex w-full max-w-7xl items-start gap-2">
                <StayDateSearch
                  {...shared}
                  compact
                  idPrefix="stay-floating"
                  className="min-w-0 flex-1"
                  labelClassName="text-white/70"
                  subtextClassName="text-white/60"
                />
                <button
                  type="button"
                  onClick={handleClose}
                  tabIndex={floating ? undefined : -1}
                  aria-label="Hide availability search"
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
