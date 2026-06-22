"use client"

import { useCallback, useState } from "react"

export function useBookingModal() {
  const [isOpen, setIsOpen] = useState(false)

  const openModal = useCallback(() => setIsOpen(true), [])
  const closeModal = useCallback(() => setIsOpen(false), [])

  return { isOpen, openModal, closeModal }
}
