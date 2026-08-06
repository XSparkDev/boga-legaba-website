"use client"

import { useCallback, useReducer } from "react"
import { addDays, minCheckInDate } from "@/lib/room-availability"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BookingDatesState {
  checkIn: string
  checkOut: string
}

// Internal state also tracks whether the user explicitly changed the checkout.
// This flag is the key to the correct Rule 1 vs Rule 3 behaviour:
//   - Rule 1 (dominant): selecting check-in always sets checkout = +2
//     UNLESS the user has already manually picked a different checkout date.
//   - Rule 3 (override): if the user intentionally set a checkout that is
//     still valid after a new check-in, keep it.
// Without this flag the reducer can't distinguish "auto-set by defaults" from
// "user-selected" — and incorrectly preserves stale auto-set dates.
interface InternalState {
  checkIn: string
  checkOut: string
  checkOutIsManual: boolean
}

type Action =
  | { type: "SET_CHECK_IN"; value: string }
  | { type: "SET_CHECK_OUT"; value: string }
  | { type: "RESET"; checkIn?: string; checkOut?: string }

export interface UseBookingDatesResult extends BookingDatesState {
  /** Min date for the check-in picker (today). */
  minCheckIn: string
  /** Min date for the check-out picker (check-in + 1 day). */
  minCheckOut: string
  /**
   * Set a new check-in date.
   * - If the user previously manually selected a checkout that is still valid
   *   (strictly after new check-in), that checkout is preserved (Rule 3).
   * - Otherwise checkout is automatically set to check-in + 2 (Rule 1).
   * - If checkout becomes ≤ check-in for any reason it is repaired to +2 (Rule 4).
   */
  setCheckIn: (date: string) => void
  /**
   * Set a new check-out date (Rule 2 — manual override).
   * - Marks the checkout as user-selected so it survives future check-in changes.
   * - If the supplied date is ≤ check-in it is automatically moved to check-in + 2.
   */
  setCheckOut: (date: string) => void
  /**
   * Replace both dates at once (e.g. from URL params or clear/reset flows).
   * Clears the manual-checkout flag — the next check-in change will auto-set +2.
   */
  reset: (opts?: { checkIn?: string; checkOut?: string }) => void
}

// ---------------------------------------------------------------------------
// Invariant helpers
// ---------------------------------------------------------------------------

/** A check-out is valid only when it is strictly after check-in. */
function validCheckOut(checkIn: string, checkOut: string): string {
  if (!checkIn || !checkOut || checkOut <= checkIn) {
    return addDays(checkIn || minCheckInDate(), 2)
  }
  return checkOut
}

/** Clamp a check-in date so it is never before today. */
function clampCheckIn(date: string): string {
  const today = minCheckInDate()
  if (!date || date < today) return today
  return date
}

// ---------------------------------------------------------------------------
// Reducer — the single source of truth for booking date logic
// ---------------------------------------------------------------------------

function reducer(state: InternalState, action: Action): InternalState {
  switch (action.type) {
    case "SET_CHECK_IN": {
      const checkIn = action.value
      const autoCheckOut = addDays(checkIn, 2)

      // Only keep an existing checkout when the user explicitly chose it AND
      // it is still valid after the new check-in. In every other case — including
      // when the checkout was set by defaults or a previous auto-calculation —
      // we always set checkout = check-in + 2 (Rule 1).
      const keepManual = state.checkOutIsManual && !!state.checkOut && state.checkOut > checkIn
      const checkOut = keepManual ? state.checkOut : autoCheckOut
      return { checkIn, checkOut, checkOutIsManual: keepManual }
    }
    case "SET_CHECK_OUT": {
      // User explicitly changed checkout → mark as manual and validate.
      const checkOut = validCheckOut(state.checkIn, action.value)
      return { ...state, checkOut, checkOutIsManual: true }
    }
    case "RESET": {
      // Programmatic reset (defaults, URL params, clear button).
      // Always clears the manual flag so the next check-in change applies Rule 1.
      const checkIn = clampCheckIn(action.checkIn ?? "")
      const checkOut = validCheckOut(checkIn, action.checkOut ?? "")
      return { checkIn, checkOut, checkOutIsManual: false }
    }
    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Central hook for all booking date state across the application.
 *
 * Pass `{ checkIn: "", checkOut: "" }` (or no args) to start with empty values
 * and call `reset()` inside a `useEffect` — this is the correct pattern for
 * components that need to avoid SSR/client hydration mismatches (today's date
 * differs between the server's UTC clock and the browser's local time).
 */
export function useBookingDates(
  initial?: { checkIn?: string; checkOut?: string },
): UseBookingDatesResult {
  const [state, dispatch] = useReducer(reducer, {
    checkIn: initial?.checkIn ?? "",
    checkOut: initial?.checkOut ?? "",
    checkOutIsManual: false,
  })

  const setCheckIn = useCallback(
    (value: string) => dispatch({ type: "SET_CHECK_IN", value }),
    [],
  )
  const setCheckOut = useCallback(
    (value: string) => dispatch({ type: "SET_CHECK_OUT", value }),
    [],
  )
  const reset = useCallback(
    (opts?: { checkIn?: string; checkOut?: string }) =>
      dispatch({ type: "RESET", checkIn: opts?.checkIn, checkOut: opts?.checkOut }),
    [],
  )

  return {
    checkIn: state.checkIn,
    checkOut: state.checkOut,
    minCheckIn: minCheckInDate(),
    // Defence-in-depth: the picker's own min attribute prevents same-day selection
    // in addition to the reducer's invariant.
    minCheckOut: state.checkIn ? addDays(state.checkIn, 1) : minCheckInDate(),
    setCheckIn,
    setCheckOut,
    reset,
  }
}
