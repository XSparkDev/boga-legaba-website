"use client"

import { useCallback, useEffect } from "react"
import { X } from "lucide-react"
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock"

interface NightsBridgeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function NightsBridgeModal({ isOpen, onClose }: NightsBridgeModalProps) {
  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (!isOpen) return

    lockBodyScroll()
    document.addEventListener("keydown", handleEscape)

    return () => {
      unlockBodyScroll()
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen, handleEscape])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="nightsbridge-modal-title"
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative flex shrink-0 items-start justify-between border-b border-black/10 px-6 py-5 pr-14">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/50">Boga Legaba</p>
            <h2 id="nightsbridge-modal-title" className="mt-1 font-display text-xl font-bold text-[#000000] sm:text-2xl">
              Check Availability &amp; Book
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 inline-flex size-10 items-center justify-center rounded-full text-black/60 transition-colors hover:bg-black/5 hover:text-black"
            aria-label="Close booking modal"
          >
            <X className="size-5" />
          </button>
        </div>

        <iframe
          src="https://book.nightsbridge.com/21091"
          title="NightsBridge Booking Engine"
          className="h-full min-h-[60vh] w-full flex-1 border-none"
          loading="lazy"
          allow="payment"
        />
      </div>
    </div>
  )
}
