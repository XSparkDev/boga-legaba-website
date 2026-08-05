"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

const SLIDE_MS = 4000

interface HeroSlideshowProps {
  images: string[]
  alt: string
  className?: string
}

/** Full-bleed background slideshow — crossfades between images, looping forever. */
export function HeroSlideshow({ images, alt, className }: HeroSlideshowProps) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (images.length <= 1) return
    const id = setInterval(() => {
      setActive((i) => (i + 1) % images.length)
    }, SLIDE_MS)
    return () => clearInterval(id)
  }, [images.length])

  return (
    <div className={cn("absolute inset-0", className)}>
      {images.map((src, i) => (
        <Image
          // Keyed by slot index, not by URL: two hero slots can legitimately
          // point at the same picture (admin sets them in the Images screen),
          // and duplicate keys stop the crossfade dead.
          key={i}
          src={src}
          alt={alt}
          fill
          priority={i === 0}
          sizes="100vw"
          className={cn(
            "object-cover transition-opacity duration-1000 ease-in-out",
            i === active ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
    </div>
  )
}
