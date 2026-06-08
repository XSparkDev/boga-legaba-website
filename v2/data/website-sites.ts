export type SiteId = "main" | "alternate"

export interface WebsiteOption {
  id: SiteId
  label: string
  shortLabel: string
  description: string
}

export const WEBSITE_OPTIONS: WebsiteOption[] = [
  {
    id: "main",
    label: "Main Website",
    shortLabel: "Main",
    description: "Primary Boga Legaba site",
  },
  {
    id: "alternate",
    label: "Website 2",
    shortLabel: "Website 2",
    description: "Alternate design preview",
  },
]

export const CURRENT_SITE_ID: SiteId =
  process.env.NEXT_PUBLIC_SITE_ID === "alternate" ? "alternate" : "main"

function siteBaseUrl(id: SiteId): string {
  if (id === "main") {
    return process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "http://localhost:3000"
  }
  return process.env.NEXT_PUBLIC_ALT_SITE_URL ?? "http://localhost:3001"
}

export function getSwitchTargetUrl(pathname: string, targetId: SiteId): string {
  const base = siteBaseUrl(targetId).replace(/\/$/, "")
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`
  return `${base}${path}`
}

export function getOtherSite(): WebsiteOption {
  const otherId: SiteId = CURRENT_SITE_ID === "main" ? "alternate" : "main"
  return WEBSITE_OPTIONS.find((s) => s.id === otherId)!
}
