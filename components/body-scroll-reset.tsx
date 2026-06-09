"use client"

import { useEffect } from "react"
import { resetBodyScrollLock } from "@/lib/body-scroll-lock"

/** Ensures the page can scroll after hard refresh or back-navigation on mobile. */
export function BodyScrollReset() {
  useEffect(() => {
    resetBodyScrollLock()
  }, [])
  return null
}
