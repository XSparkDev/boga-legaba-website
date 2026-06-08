import { cn } from "@/lib/utils"

type SiteLogoSize = "nav" | "footer" | "hero"

const SIZE_CLASSES: Record<SiteLogoSize, string> = {
  nav: "h-12 w-auto sm:h-14 xl:h-16",
  footer: "h-16 w-auto sm:h-20 lg:h-24",
  hero: "h-20 w-auto sm:h-24 md:h-28 lg:h-32",
}

interface SiteLogoProps {
  size?: SiteLogoSize
  className?: string
  /** White logo for dark backgrounds (default). Use "dark" on light backgrounds. */
  variant?: "light" | "dark"
}

export function SiteLogo({ size = "nav", className, variant = "light" }: SiteLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.svg"
      alt="Boga Legaba Guest House & Conference Centre"
      width={2856}
      height={1280}
      className={cn(
        SIZE_CLASSES[size],
        "max-w-full object-contain object-left",
        variant === "light" && "brightness-0 invert",
        className,
      )}
    />
  )
}
