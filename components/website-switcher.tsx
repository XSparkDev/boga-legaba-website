"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeftRight } from "lucide-react"
import {
  detectSiteFromPath,
  getSwitchTargetPath,
  WEBSITE_OPTIONS,
  type SiteId,
} from "@/lib/website-sites"
import { cn } from "@/lib/utils"

type SwitcherVariant = "dark" | "light"

function SiteShortLabel({ siteId, fullLabel }: { siteId: SiteId; fullLabel: string }) {
  if (siteId !== "alternate") return fullLabel
  return (
    <>
      <span className="xl:hidden">Site 2</span>
      <span className="hidden xl:inline">{fullLabel}</span>
    </>
  )
}

interface WebsiteSwitcherProps {
  variant?: SwitcherVariant
  className?: string
  compact?: boolean
}

export function WebsiteSwitcher({ variant = "dark", className, compact = false }: WebsiteSwitcherProps) {
  const pathname = usePathname()
  const currentSite = detectSiteFromPath(pathname)
  const isDark = variant === "dark"

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      role="group"
      aria-label="Switch website version"
    >
      {!compact ? (
        <span
          className={cn(
            "hidden items-center gap-1 font-mono text-[10px] uppercase tracking-wider xl:inline-flex",
            isDark ? "text-white/45" : "text-body-brown/60",
          )}
        >
          <ArrowLeftRight className="size-3" aria-hidden />
          Site
        </span>
      ) : null}

      <div
        className={cn(
          "inline-flex rounded-full p-0.5",
          isDark ? "bg-white/10 ring-1 ring-white/15" : "bg-warm-sand ring-1 ring-deep-earth/10",
        )}
      >
        {WEBSITE_OPTIONS.map((site) => {
          const active = site.id === currentSite
          const href = getSwitchTargetPath(pathname, site.id)

          if (active) {
            return (
              <span
                key={site.id}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium sm:px-3 sm:text-xs",
                  isDark ? "bg-gold text-[#0A0A0A]" : "bg-terracotta text-white",
                )}
                aria-current="true"
              >
                <SiteShortLabel siteId={site.id} fullLabel={site.shortLabel} />
              </span>
            )
          }

          return (
            <Link
              key={site.id}
              href={href}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors sm:px-3 sm:text-xs",
                isDark
                  ? "text-white/70 hover:bg-white/10 hover:text-white"
                  : "text-body-brown/70 hover:bg-white/60 hover:text-deep-earth",
              )}
              title={`Switch to ${site.label}`}
            >
              <SiteShortLabel siteId={site.id} fullLabel={site.shortLabel} />
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
