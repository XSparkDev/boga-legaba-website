import { createSupabaseAdminClient } from "@/lib/supabase/admin"

/**
 * Admin-added extra gallery photos (table `gallery_custom`, migration 020).
 * The public Gallery page appends visible rows after the fixed items. Any DB
 * issue (table not migrated yet, no rows, network error) yields [] so the
 * gallery is unaffected until the admin adds photos.
 */

export interface GalleryCustomPhoto {
  id: string
  image_url: string
  label: string
  category: string
  sort_order: number
  visible: boolean
}

/** Custom photos must use an existing gallery filter category. */
export const GALLERY_CUSTOM_CATEGORIES = [
  "Chababa",
  "Interlaken A",
  "Lantana",
  "Conference",
  "Dining",
] as const

export async function getGalleryCustomPhotos(): Promise<GalleryCustomPhoto[]> {
  try {
    const sb = createSupabaseAdminClient()
    const { data, error } = await sb
      .from("gallery_custom")
      .select("id, image_url, label, category, sort_order, visible")
      .eq("visible", true)
      .order("sort_order", { ascending: true })
    if (error || !data?.length) return []
    return (data as GalleryCustomPhoto[]).filter(
      (p) => p.image_url && (GALLERY_CUSTOM_CATEGORIES as readonly string[]).includes(p.category),
    )
  } catch {
    return []
  }
}
