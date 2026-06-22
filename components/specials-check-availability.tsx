"use client"

import { ArrowRight } from "lucide-react"
import { NightsBridgeModal } from "@/components/NightsBridgeModal"
import { useBookingModal } from "@/hooks/useBookingModal"
import { cn } from "@/lib/utils"

export function SpecialsCheckAvailability({ className }: { className?: string }) {
  const { isOpen, openModal, closeModal } = useBookingModal()

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={cn(
          "group mt-6 inline-flex items-center gap-2 rounded-full bg-terracotta px-8 py-3.5 font-sans text-sm font-medium text-white transition-colors hover:bg-terracotta-light",
          className,
        )}
      >
        Check Availability
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </button>
      <NightsBridgeModal isOpen={isOpen} onClose={closeModal} />
    </>
  )
}
