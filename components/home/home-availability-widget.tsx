"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { StayDateSearch } from "@/components/stay/stay-date-search"
import { useAvailability } from "@/hooks/useAvailability"
import { defaultCheckInOut } from "@/lib/room-availability"
import { cn } from "@/lib/utils"

const DISMISS_KEY = "home-availability-widget-dismissed"

export function HomeAvailabilityWidget() {
  const availability = useAvailability()
  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [scrolledPast, setScrolledPast] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const defaults = defaultCheckInOut()
    setCheckIn(defaults.checkIn)
    setCheckOut(defaults.checkOut)
  }, [])

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1")
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolledPast(window.scrollY > window.innerHeight - 160)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
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

  function handleClose() {
    setDismissed(true)
    sessionStorage.setItem(DISMISS_KEY, "1")
  }

  // Dismissing only closes the FLOATING bar. The copy sitting in the hero is
  // always rendered — hiding that one too would leave the guest with no way to
  // search dates again for the rest of the session.
  const floating = scrolledPast && !dismissed

  const availableCount = availability.searched
    ? Array.from(availability.byRoom.values()).filter((s) => s.available).length
    : undefined

  return (
    <div
      className={cn(
        floating
          ? "fixed left-0 right-0 top-[4.5rem] z-[60] flex justify-center bg-white px-4 py-4 shadow-lg xl:top-[6rem]"
          : "relative w-full",
      )}
    >
      <div className={cn("relative w-full", floating && "max-w-7xl")}>
        {floating ? (
          <button
            type="button"
            onClick={handleClose}
            aria-label="Hide availability search"
            className="absolute -top-2 -right-2 z-10 inline-flex size-8 items-center justify-center rounded-full bg-black text-white shadow-lg ring-2 ring-white hover:bg-black/80"
          >
            <X className="size-4" />
          </button>
        ) : null}
        <StayDateSearch
          checkIn={checkIn}
          checkOut={checkOut}
          onCheckInChange={setCheckIn}
          onCheckOutChange={setCheckOut}
          onSearch={handleSearch}
          onClear={handleClear}
          loading={availability.loading}
          searched={availability.searched}
          availableCount={availableCount}
          subtextClassName={floating ? undefined : "text-white"}
          className={cn(
            "rounded-2xl border-[rgba(255,255,255,0.6)] bg-[rgba(255,255,255,0.12)] transition-colors duration-250",
            floating && "border-transparent bg-white shadow-none",
          )}
        />
      </div>
    </div>
  )
}
