"use client"

import { useCallback, useState } from "react"
import type { AvailabilityRow } from "@/app/api/availability/route"
import {
  availabilityQueryRange,
  roomKey,
  summarizeAvailability,
  type RoomAvailabilitySummary,
} from "@/lib/room-availability"

export function useAvailability() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [byRoom, setByRoom] = useState<Map<string, RoomAvailabilitySummary>>(new Map())

  const search = useCallback(async (from: string, to: string) => {
    const range = availabilityQueryRange(from, to)
    if (!range) {
      setError("Check-out must be after check-in.")
      setSearched(false)
      setByRoom(new Map())
      return
    }

    setLoading(true)
    setError(null)
    setCheckIn(from)
    setCheckOut(to)

    try {
      const params = new URLSearchParams({ from: range.from, to: range.to })
      const res = await fetch(`/api/availability?${params}`, { cache: "no-store" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Availability request failed (${res.status})`)
      }
      const rows = (await res.json()) as AvailabilityRow[]
      setByRoom(summarizeAvailability(rows, from, to))
      setSearched(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load availability")
      setByRoom(new Map())
      setSearched(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    setSearched(false)
    setByRoom(new Map())
    setError(null)
    setCheckIn("")
    setCheckOut("")
  }, [])

  function getForRoom(roomName: string, propertyName: string): RoomAvailabilitySummary | undefined {
    return byRoom.get(roomKey(roomName, propertyName))
  }

  return {
    loading,
    error,
    searched,
    checkIn,
    checkOut,
    byRoom,
    search,
    clear,
    getForRoom,
  }
}
