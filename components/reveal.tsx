"use client"

import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { createRevealObserver } from "@/lib/reveal-observer"
import { cn } from "@/lib/utils"

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  as?: "div" | "section" | "li" | "article" | "header"
}

export function Reveal({ children, className, delay = 0, as = "div" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = createRevealObserver(el, () => setVisible(true))
    return () => observer?.disconnect()
  }, [])

  const Tag = as

  return (
    <Tag
      ref={ref as never}
      className={cn("reveal", visible && "is-visible", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}
