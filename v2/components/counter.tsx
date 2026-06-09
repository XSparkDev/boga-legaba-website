'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { isElementInViewport, prefersReducedMotion } from '@/lib/reveal-observer'

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

export function Counter({
  to,
  duration = 1500,
  suffix = '',
  className,
}: {
  to: number
  duration?: number
  suffix?: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const [value, setValue] = useState(to)
  const [showSuffix, setShowSuffix] = useState(true)
  const started = useRef(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const runCount = () => {
      if (started.current) return
      started.current = true
      setShowSuffix(false)
      setValue(0)
      const start = performance.now()
      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1)
        const eased = easeOutCubic(progress)
        setValue(Math.round(eased * to))
        if (progress >= 1) {
          setShowSuffix(true)
        } else {
          requestAnimationFrame(tick)
        }
      }
      requestAnimationFrame(tick)
    }

    if (prefersReducedMotion()) {
      setValue(to)
      setShowSuffix(true)
      return
    }

    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches
    if (isCoarsePointer && isElementInViewport(el)) {
      setValue(to)
      setShowSuffix(true)
      return
    }

    if (isElementInViewport(el)) {
      runCount()
      return
    }

    setValue(0)
    setShowSuffix(false)

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          runCount()
          observer.disconnect()
        }
      },
      { threshold: 0.2, rootMargin: '0px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [to, duration])

  return (
    <span ref={ref} className={className} data-cursor="stats">
      {value}
      {showSuffix ? suffix : ''}
    </span>
  )
}
