/**
 * Registry of the fixed, admin-editable image slots on the marketing pages.
 *
 * This is the single source of truth shared by:
 *   - the public resolver (lib/site-images-live.ts) — for each slot's DEFAULT,
 *   - the admin editor (components/admin/site-images-client.tsx) — to list the
 *     slots grouped by page.
 *
 * A slot's `key` is the same string the page code resolves (e.g. "conference",
 * "specials.extended-stay", "gallery.chababa-reeds", "hero.slide.1"). Defaults
 * come from the static data/site-images.ts where a matching key exists; the
 * Home hero slideshow slots have hardcoded defaults (those live as an array in
 * the hero component, not in site-images.ts).
 *
 * No server-only imports here — the admin client component imports this too.
 */
import { siteImages } from "@/data/site-images"

export type SiteImagePage = "Home" | "Conference" | "Dining" | "Attractions" | "Specials" | "Gallery"

export type SiteImageSlot = {
  key: string
  label: string
  page: SiteImagePage
  defaultUrl: string
  defaultAlt: string
}

/** Pull a default from the static file; empty strings if the key isn't there. */
function staticDefault(key: string): { url: string; alt: string } {
  const img = (siteImages as Record<string, { url: string; alt: string }>)[key]
  return img ? { url: img.url, alt: img.alt } : { url: "", alt: "" }
}

function slot(key: string, label: string, page: SiteImagePage, fallback?: { url: string; alt: string }): SiteImageSlot {
  const d = staticDefault(key)
  return {
    key,
    label,
    page,
    defaultUrl: d.url || fallback?.url || "",
    defaultAlt: d.alt || fallback?.alt || "",
  }
}

// The Home hero is a 5-image slideshow whose defaults live as a hardcoded array
// in components/home/hero.tsx — mirror them here so each slide is its own slot.
const HERO_SLIDE_DEFAULTS = [
  "/boga_hero_/hero-1.jpg",
  "/boga_hero_/hero-2.jpg",
  "/boga_hero_/hero-3.jpg",
  "/boga_hero_/hero-4.jpg",
  "/boga_hero_/hero-5.jpg",
]

export const SITE_IMAGE_SLOTS: SiteImageSlot[] = [
  // ── Home ──────────────────────────────────────────────────────────────────
  ...HERO_SLIDE_DEFAULTS.map((url, i) =>
    slot(`hero.slide.${i + 1}`, `Hero slideshow · Slide ${i + 1}`, "Home", {
      url,
      alt: "Boga Legaba guest house",
    }),
  ),
  slot("property.chababa", "Property card · Chababa", "Home"),
  slot("property.interlaken-a", "Property card · Interlaken A", "Home"),
  slot("property.lantana", "Property card · Lantana", "Home"),

  // ── Conference ──────────────────────────────────────────────────────────────
  slot("conference", "Conference · Main image", "Conference"),

  // ── Dining ──────────────────────────────────────────────────────────────────
  slot("dining", "Dining · Main image", "Dining"),

  // ── Attractions ─────────────────────────────────────────────────────────────
  slot("attractions.map", "Attractions · Region image", "Attractions"),

  // ── Specials ────────────────────────────────────────────────────────────────
  slot("specials.extended-stay", "Special · Extended Stay", "Specials"),
  slot("specials.conference-accommodation", "Special · Conference Accommodation", "Specials"),
  slot("specials.government-rate", "Special · Government Rate", "Specials"),

  // ── Gallery ─────────────────────────────────────────────────────────────────
  slot("gallery.chababa-reeds", "Gallery · Chababa Reeds Room", "Gallery"),
  slot("gallery.chababa-lounge", "Gallery · Chababa Lounge", "Gallery"),
  slot("gallery.interlaken-exterior", "Gallery · Interlaken A Exterior", "Gallery"),
  slot("gallery.interlaken-segametsi", "Gallery · Interlaken A Segametsi", "Gallery"),
  slot("gallery.lantana-garden", "Gallery · Lantana Garden", "Gallery"),
  slot("gallery.conference-theatre", "Gallery · Conference Theatre Setup", "Gallery"),
  slot("gallery.conference-boardroom", "Gallery · Conference Boardroom", "Gallery"),
  slot("gallery.dining-restaurant", "Gallery · Dining Restaurant", "Gallery"),
  slot("gallery.dining-bar", "Gallery · Dining Bar", "Gallery"),
]

export const SITE_IMAGE_PAGES: SiteImagePage[] = [
  "Home",
  "Conference",
  "Dining",
  "Attractions",
  "Specials",
  "Gallery",
]

/** Map of key → built-in default, for the resolver's fallback. */
export const SITE_IMAGE_DEFAULTS: Record<string, { url: string; alt: string }> = Object.fromEntries(
  SITE_IMAGE_SLOTS.map((s) => [s.key, { url: s.defaultUrl, alt: s.defaultAlt }]),
)
