import Image from 'next/image'
import { cn } from '@v2/lib/utils'

type SiteLogoProps = {
  /** Black logo for light backgrounds; inverted for dark backgrounds */
  variant?: 'dark' | 'light'
  className?: string
  priority?: boolean
}

export function SiteLogo({ variant = 'dark', className, priority }: SiteLogoProps) {
  return (
    <Image
      src="/logo1.svg"
      alt="Boga Legaba Guest House & Conference"
      width={286}
      height={128}
      priority={priority}
      className={cn(
        'h-12 w-auto sm:h-14 xl:h-16',
        variant === 'light' && 'brightness-0 invert',
        className
      )}
    />
  )
}
