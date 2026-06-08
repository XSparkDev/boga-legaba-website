"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  detectSiteFromPath,
  getSwitchTargetPath,
  WEBSITE_OPTIONS,
  type SiteId,
} from "@/lib/website-sites"
import { cn } from "@/lib/utils"

type SwitcherVariant = "dark" | "light"

function SwitcherLabel({ shortLabel }: { shortLabel: string }) {
  return <span>{shortLabel}</span>
}

interface WebsiteSwitcherProps {
  variant?: SwitcherVariant
  className?: string
}

export function WebsiteSwitcher({ variant = "dark", className }: WebsiteSwitcherProps) {
  const pathname = usePathname()
  const currentSite = detectSiteFromPath(pathname)
  const isDark = variant === "dark"

  return (
    <div
      className={cn("shrink-0", className)}
      role="group"
      aria-label="Switch website version"
    >
      <div
        className={cn(
          "inline-flex w-[11.5rem] rounded-full p-0.5 xl:w-[13.5rem]",
          isDark ? "bg-white/10 ring-1 ring-white/15" : "bg-warm-sand ring-1 ring-deep-earth/10",
        )}
      >
        {WEBSITE_OPTIONS.map((site) => {
          const active = site.id === currentSite
          const href = getSwitchTargetPath(pathname, site.id)
          const pillClass = cn(
            "flex flex-1 items-center justify-center rounded-full py-1 text-center text-[11px] font-medium leading-none sm:text-xs",
            "min-w-[4.75rem] xl:min-w-[5.75rem]",
          )

          if (active) {
            return (
              <span
                key={site.id}
                className={cn(
                  pillClass,
                  isDark ? "bg-gold text-[#0A0A0A]" : "bg-terracotta text-white",
                )}
                aria-current="true"
              >
                <SwitcherLabel shortLabel={site.shortLabel} />
              </span>
            )
          }

          return (
            <Link
              key={site.id}
              href={href}
              className={cn(
                pillClass,
                "transition-colors",
                isDark
                  ? "text-white/70 hover:bg-white/10 hover:text-white"
                  : "text-body-brown/70 hover:bg-white/60 hover:text-deep-earth",
              )}
              title={`Switch to ${site.label}`}
            >
              <SwitcherLabel shortLabel={site.shortLabel} />
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function WebsiteSwitcherMobile({ variant = "dark" }: { variant?: SwitcherVariant }) {
  const pathname = usePathname()
  const currentSite = detectSiteFromPath(pathname)
  const isDark = variant === "dark"

  return (
    <div className={cn("border-b pb-4", isDark ? "border-white/10" : "border-white/15")}>
      <p className={cn("font-mono text-[10px] uppercase tracking-wider", isDark ? "text-white/40" : "text-white/50")}>
        Switch website
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {WEBSITE_OPTIONS.map((site) => {
          const active = site.id === currentSite
          const href = getSwitchTargetPath(pathname, site.id as SiteId)

          if (active) {
            return (
              <span
                key={site.id}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium",
                  isDark ? "bg-gold/20 text-gold" : "bg-terracotta/30 text-white",
                )}
              >
                {site.label} · current
              </span>
            )
          }

          return (
            <Link
              key={site.id}
              href={href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm transition-colors",
                isDark ? "text-white/80 hover:bg-white/10" : "text-white/80 hover:bg-white/10",
              )}
            >
              Go to {site.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
