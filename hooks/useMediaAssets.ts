"use client"

import { useEffect, useState } from "react"
import type { MediaAssetRow } from "@/app/api/media/route"

export function useMediaAssets() {
  const [byRoomId, setByRoomId] = useState<Map<number, MediaAssetRow>>(new Map())
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<"database" | "unavailable" | "error">("unavailable")

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/media", { cache: "no-store" })
        const json = (await res.json()) as { assets: MediaAssetRow[]; source?: string }
        const map = new Map<number, MediaAssetRow>()
        for (const asset of json.assets ?? []) {
          if (asset.bbroomid && asset.is_primary) {
            map.set(asset.bbroomid, asset)
          }
        }
        if (!cancelled) {
          setByRoomId(map)
          setSource(json.source === "database" ? "database" : "unavailable")
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

  return { byRoomId, loading, source, hasLiveImages: source === "database" && byRoomId.size > 0 }
}
