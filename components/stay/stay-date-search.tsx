"use client"

import { CalendarRange, Loader2, X } from "lucide-react"
import { inputClass } from "@/components/forms/form-ui"
import { minCheckInDate } from "@/lib/room-availability"
import { cn } from "@/lib/utils"

type StayDateSearchProps = {
  checkIn: string
  checkOut: string
  onCheckInChange: (value: string) => void
  onCheckOutChange: (value: string) => void
  onSearch: () => void
  onClear: () => void
  loading?: boolean
  searched?: boolean
  availableCount?: number
  className?: string
}

export function StayDateSearch({
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
  onSearch,
  onClear,
  loading,
  searched,
  availableCount,
  className,
}: StayDateSearchProps) {
  const minOut = checkIn || minCheckInDate()

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5 sm:p-6", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-gold">
            <CalendarRange className="size-3.5" /> Check availability
          </p>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            Pick your dates to see which rooms are free, synced from NightsBridge.
          </p>
        </div>
        {searched && availableCount != null ? (
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            {availableCount} {availableCount === 1 ? "room" : "rooms"} available for your dates
          </p>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="stay-check-in" className="text-sm font-medium text-foreground">
            Check-in
          </label>
          <input
            id="stay-check-in"
            type="date"
            className={inputClass}
            min={minCheckInDate()}
            value={checkIn}
            onChange={(e) => onCheckInChange(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="stay-check-out" className="text-sm font-medium text-foreground">
            Check-out
          </label>
          <input
            id="stay-check-out"
            type="date"
            className={inputClass}
            min={minOut}
            value={checkOut}
            onChange={(e) => onCheckOutChange(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={onSearch}
          disabled={loading || !checkIn || !checkOut}
          className="btn-gold h-[46px] justify-center px-6 text-sm disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Search"}
        </button>
        {searched ? (
          <button
            type="button"
            onClick={onClear}
            className="btn-glass h-[46px] justify-center gap-2 px-4 text-sm"
          >
            <X className="size-4" /> Clear
          </button>
        ) : null}
      </div>
    </div>
  )
}
