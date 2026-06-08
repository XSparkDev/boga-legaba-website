export type SiteId = "main" | "alternate"

export const V2_PREFIX = "/v2"

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

export function detectSiteFromPath(pathname: string): SiteId {
  return pathname === V2_PREFIX || pathname.startsWith(`${V2_PREFIX}/`) ? "alternate" : "main"
}

/** Strip /v2 prefix to get the shared page path */
export function toSharedPath(pathname: string): string {
  if (pathname === V2_PREFIX) return "/"
  if (pathname.startsWith(`${V2_PREFIX}/`)) {
    const rest = pathname.slice(V2_PREFIX.length)
    return rest || "/"
  }
  return pathname || "/"
}

/** Build in-app URL for the target site version */
export function getSwitchTargetPath(pathname: string, targetId: SiteId): string {
  const shared = toSharedPath(pathname)

  if (targetId === "alternate") {
    return shared === "/" ? V2_PREFIX : `${V2_PREFIX}${shared}`
  }

  return shared
}
