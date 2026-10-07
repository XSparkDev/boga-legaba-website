import { PartyPopper, TreePalm, UtensilsCrossed, Wine, type LucideIcon } from "lucide-react"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

/**
 * Dining page cards, admin-editable via /admin/dining (table
 * `dining_sections`, migration 019). The public Dining page renders visible
 * rows ordered by sort_order; if the table is missing/empty/unreachable it
 * falls back to DEFAULT_SECTIONS, so the page never breaks.
 */

export type DiningSectionStatus = "coming-soon" | "open"

export interface DiningSection {
  id: string
  title: string
  body: string
  icon: string
  status: DiningSectionStatus
  sort_order: number
  visible: boolean
}

export const DINING_ICON_OPTIONS = [
  { key: "utensils", label: "Cutlery (restaurant)" },
  { key: "party", label: "Party popper (events)" },
  { key: "outdoor", label: "Palm tree (outdoor)" },
  { key: "wine", label: "Wine glass (bar)" },
] as const

export type DiningIconKey = (typeof DINING_ICON_OPTIONS)[number]["key"]

const ICONS: Record<string, LucideIcon> = {
  utensils: UtensilsCrossed,
  party: PartyPopper,
  outdoor: TreePalm,
  wine: Wine,
}

export function diningIconFor(key: string): LucideIcon {
  return ICONS[key] ?? UtensilsCrossed
}

export const DINING_STATUSES: { key: DiningSectionStatus; label: string }[] = [
  { key: "coming-soon", label: "Coming soon" },
  { key: "open", label: "Open" },
]

/** Built-in cards shown when the admin table has nothing to show. */
export const DEFAULT_DINING_SECTIONS: DiningSection[] = [
  {
    id: "dining",
    title: "Dining",
    body: "Planned: a relaxed restaurant serving local and contemporary dishes for Boga guests and visitors, once open.",
    icon: "utensils",
    status: "coming-soon",
    sort_order: 10,
    visible: true,
  },
  {
    id: "private-events",
    title: "Private Events",
    body: "A future Lantana venue for intimate celebrations, corporate functions and milestone occasions.",
    icon: "party",
    status: "coming-soon",
    sort_order: 20,
    visible: true,
  },
  {
    id: "outdoor-venue",
    title: "Outdoor Venue",
    body: "A landscaped outdoor space planned for daytime gatherings and golden-hour receptions.",
    icon: "outdoor",
    status: "coming-soon",
    sort_order: 30,
    visible: true,
  },
  {
    id: "bar",
    title: "Bar",
    body: "A welcoming bar planned for after-work drinks, nightcaps and social evenings.",
    icon: "wine",
    status: "coming-soon",
    sort_order: 40,
    visible: true,
  },
]

/**
 * Visible sections for the public page, ordered. Empty table (admin removed
 * every card) returns [] so removals really remove. Only a DB failure (table
 * not migrated yet, network error) falls back to DEFAULT_SECTIONS.
 */
export async function getDiningSections(): Promise<DiningSection[]> {
  try {
    const sb = createSupabaseAdminClient()
    const { data, error } = await sb
      .from("dining_sections")
      .select("id, title, body, icon, status, sort_order, visible")
      .eq("visible", true)
      .order("sort_order", { ascending: true })
    if (error) return DEFAULT_DINING_SECTIONS
    return ((data as DiningSection[]) ?? []).filter((s) => s.title?.trim())
  } catch {
    return DEFAULT_DINING_SECTIONS
  }
}
