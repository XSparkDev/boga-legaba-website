"use client"

import { CalendarRange, Loader2, X } from "lucide-react"
import { inputClass } from "@/components/forms/form-ui"
import { addDays, minCheckInDate, maxBookingDate } from "@/lib/room-availability"
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
  gridClassName?: string
  subtextClassName?: string
  labelClassName?: string
  /**
   * Overrides the "Check availability" heading colour. The home hero sits on a
   * photo where the default gold is hard to read; the Stay page card keeps it.
   */
  titleClassName?: string
  /**
   * Prefixes the input ids. The home page renders this twice (hero copy +
   * floating bar), so the second copy needs its own ids for the labels to work.
   */
  idPrefix?: string
  /** Single-row bar layout used by the floating home widget. */
  compact?: boolean
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
  gridClassName,
  subtextClassName,
  labelClassName,
  titleClassName,
  idPrefix = "stay",
  compact,
}: StayDateSearchProps) {
  // min for check-out is check-in + 1 day (one-night stays allowed, same-day not).
  // This is defence-in-depth: the useBookingDates hook also validates in state.
  const minOut = checkIn ? addDays(checkIn, 1) : minCheckInDate()
  const checkInId = `${idPrefix}-check-in`
  const checkOutId = `${idPrefix}-check-out`

  const countLabel =
    searched && availableCount != null
      ? `${availableCount} ${availableCount === 1 ? "room" : "rooms"} available for your dates`
      : null

  const fields = (
    <>
      <div className={cn("flex flex-col gap-1.5", compact && "min-w-0 flex-1 sm:w-[9.5rem] sm:flex-none")}>
        <label htmlFor={checkInId} className={cn("text-sm font-medium text-foreground", compact && "sr-only sm:not-sr-only", labelClassName)}>
          Check-in
        </label>
        <input
          id={checkInId}
          type="date"
          className={inputClass}
          min={minCheckInDate()}
          max={maxBookingDate()}
          value={checkIn}
          onChange={(e) => onCheckInChange(e.target.value)}
        />
      </div>
      <div className={cn("flex flex-col gap-1.5", compact && "min-w-0 flex-1 sm:w-[9.5rem] sm:flex-none")}>
        <label htmlFor={checkOutId} className={cn("text-sm font-medium text-foreground", compact && "sr-only sm:not-sr-only", labelClassName)}>
          Check-out
        </label>
        <input
          id={checkOutId}
          type="date"
          className={inputClass}
          min={minOut}
          max={maxBookingDate()}
          value={checkOut}
          onChange={(e) => onCheckOutChange(e.target.value)}
        />
      </div>
    </>
  )

  const actions = (
    <>
      <button
        type="button"
        onClick={onSearch}
        disabled={loading || !checkIn || !checkOut}
        className={cn("btn-gold h-[50px] justify-center px-6 text-sm disabled:opacity-50", compact && "flex-1 sm:flex-none")}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : "Search"}
      </button>
      {searched ? (
        <button
          type="button"
          onClick={onClear}
          className="btn-glass h-[50px] justify-center gap-2 px-4 text-sm"
        >
          <X className="size-4" /> Clear
        </button>
      ) : null}
    </>
  )

  if (compact) {
    return (
      <div className={cn("flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between", className)}>
        {/* The heading is decorative once the bar is docked — on phones the room
            count is the only line worth the vertical space. */}
        <div className={cn("min-w-0", !countLabel && "hidden sm:block")}>
          <p className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-gold sm:flex">
            <CalendarRange className="size-3.5" /> Check availability
          </p>
          {countLabel ? (
            <p className={cn("font-mono text-[11px] uppercase tracking-wide text-muted-foreground sm:mt-1", subtextClassName)}>
              {countLabel}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {fields}
          <div className="flex w-full gap-3 sm:contents">{actions}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5 sm:p-6", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={cn("flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-gold", titleClassName)}>
            <CalendarRange className="size-3.5" /> Check availability
          </p>
          <p className={cn("mt-1 font-body text-sm text-muted-foreground", subtextClassName)}>
            Pick your dates to see which rooms are free, synced from NightsBridge.
          </p>
        </div>
        {countLabel ? (
          <p className={cn("font-mono text-[11px] uppercase tracking-wide text-muted-foreground", subtextClassName)}>{countLabel}</p>
        ) : null}
      </div>

      <div className={cn("mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]", gridClassName)}>
        {fields}
        {actions}
      </div>
    </div>
  )
}
