"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Warms the client router cache for the main marketing routes shortly after the
 * landing page settles, so moving between pages feels instant. Runs on browser
 * idle and SKIPS entirely on data-saver / very slow (2g) connections, so it
 * never competes with a weak network — on those, pages just load on demand.
 */
const ROUTES = [
  "/conference",
  "/corporate",
  "/dining",
  "/attractions",
  "/specials",
  "/gallery",
  "/faqs",
  "/contact",
  "/book-now",
]

export function RoutePrefetcher() {
  const router = useRouter()

  useEffect(() => {
    const conn = (
      navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }
    ).connection
    if (conn?.saveData || (conn?.effectiveType && conn.effectiveType.includes("2g"))) return

    let cancelled = false
    const run = () => {
      if (cancelled) return
      for (const route of ROUTES) router.prefetch(route)
    }

    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void) => number
      cancelIdleCallback?: (id: number) => void
    }
    let idleId: number | undefined
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    if (w.requestIdleCallback) idleId = w.requestIdleCallback(run)
    else timeoutId = setTimeout(run, 1500)

    return () => {
      cancelled = true
      if (idleId !== undefined && w.cancelIdleCallback) w.cancelIdleCallback(idleId)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [router])

  return null
}
