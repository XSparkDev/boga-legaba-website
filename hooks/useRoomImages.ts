"use client"

import { useEffect, useState } from "react"
import type { RoomImage } from "@/lib/room-images"

/** Every room's admin-uploaded photos, grouped by bbroomid, fetched once. */
export function useRoomImages() {
  const [byBbroomid, setByBbroomid] = useState<Map<number, RoomImage[]>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/room-images", { cache: "no-store" })
        const json = (await res.json()) as { ok: boolean; byBbroomid?: Record<string, RoomImage[]> }
        const map = new Map<number, RoomImage[]>()
        for (const [id, images] of Object.entries(json.byBbroomid ?? {})) {
          map.set(Number(id), images)
        }
        if (!cancelled) setByBbroomid(map)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { byBbroomid, loading }
}
