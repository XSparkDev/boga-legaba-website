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
  const [floating, setFloating] = useState(false)
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
    const onScroll = () => setFloating(window.scrollY > window.innerHeight - 160)
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

  if (dismissed) return null

  const availableCount = availability.searched
    ? Array.from(availability.byRoom.values()).filter((s) => s.available).length
    : undefined

  return (
    <div
      className={cn(
        floating
          ? "fixed left-1/2 top-4 z-40 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 sm:top-6"
          : "relative w-full max-w-2xl",
      )}
    >
      {floating ? (
        <button
          type="button"
          onClick={handleClose}
          aria-label="Hide availability search"
          className="absolute -top-2 -right-2 z-10 inline-flex size-7 items-center justify-center rounded-full bg-black text-white shadow-md hover:bg-black/80"
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
        className={cn(
          "rounded border-[rgba(255,255,255,0.6)] bg-transparent shadow-none transition-colors duration-250 hover:border-white hover:bg-[rgba(255,255,255,0.12)]",
          floating && "border-border bg-card shadow-xl hover:border-border hover:bg-card",
        )}
      />
    </div>
  )
}
