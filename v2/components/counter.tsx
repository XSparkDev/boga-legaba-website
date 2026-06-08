'use client'

import { useEffect, useRef, useState } from 'react'

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
  const [value, setValue] = useState(0)
  const [showSuffix, setShowSuffix] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setValue(to)
      setShowSuffix(true)
      return
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
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
        observer.disconnect()
      }
    }, { threshold: 0.35 })

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
