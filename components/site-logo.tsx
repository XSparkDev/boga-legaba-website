import { cn } from "@/lib/utils"

type SiteLogoSize = "nav" | "footer" | "hero"

// Brand guide: minimum logo width 120px digital. At the logo's 900:394
// aspect ratio, h-12 (48px tall -> ~110px wide) falls just under that floor,
// so the smallest nav breakpoint is bumped to h-14 (~128px wide).
const SIZE_CLASSES: Record<SiteLogoSize, string> = {
  nav: "h-14 w-auto sm:h-14 xl:h-16",
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
      src="/logo.png"
      alt="Boga Legaba Guest House & Conference Centre"
      width={900}
      height={394}
      className={cn(
        SIZE_CLASSES[size],
        "max-w-full object-contain object-left",
        variant === "light" && "brightness-0 invert",
        className,
      )}
    />
  )
}
