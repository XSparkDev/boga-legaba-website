"use client"

import { useEffect, useState } from "react"
import type { SyncedProperty } from "@/lib/synced-rooms"

export type RoomsApiResponse = {
  source: "database" | "empty" | "error"
  syncedAt: string | null
  properties: SyncedProperty[]
  error?: string
}

export function useSyncedRooms() {
  const [data, setData] = useState<RoomsApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch("/api/rooms", { cache: "no-store" })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `Failed to load rooms (${res.status})`)
        }
        const json = (await res.json()) as RoomsApiResponse
        if (!cancelled) {
          setData(json)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load rooms")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { data, loading, error }
}
