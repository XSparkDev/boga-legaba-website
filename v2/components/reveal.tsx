'use client'

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react'
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

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
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
