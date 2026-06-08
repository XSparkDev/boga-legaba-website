import { V2_PREFIX } from "@/lib/website-sites"

/** Prefix an app path for the V2 site section */
export function v2Path(path: string): string {
  if (!path || path === "/") return V2_PREFIX
  const normalized = path.startsWith("/") ? path : `/${path}`
  if (normalized.startsWith(V2_PREFIX)) return normalized
  return `${V2_PREFIX}${normalized}`
}
