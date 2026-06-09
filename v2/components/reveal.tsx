'use client'

import { useLayoutEffect, useRef, useState, type ElementType, type ReactNode } from 'react'
import { createRevealObserver } from '@/lib/reveal-observer'
import { cn } from '@v2/lib/utils'

type Variant = 'up' | 'right' | 'scale'

const variantClass: Record<Variant, string> = {
  up: 'reveal',
  right: 'reveal-right',
  scale: 'reveal-scale',
}

export function Reveal({
  children,
  variant = 'up',
  delay = 0,
  as: Tag = 'div',
  className,
}: {
  children: ReactNode
  variant?: Variant
  delay?: number
  as?: ElementType
  className?: string
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = createRevealObserver(el, () => setVisible(true))
    return () => observer?.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={cn(variantClass[variant], visible && 'is-visible', className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  )
}
