import Image from "next/image"
import { cn } from "@/lib/utils"

interface SiteImageProps {
  src: string
  alt: string
  className?: string
  fill?: boolean
  priority?: boolean
  sizes?: string
}

export function SiteImage({ src, alt, className, fill, priority, sizes }: SiteImageProps) {
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={cn("object-cover", className)}
        priority={priority}
        sizes={sizes}
      />
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={1200}
      height={800}
      className={cn("h-full w-full object-cover", className)}
      priority={priority}
      sizes={sizes}
    />
  )
}
