import { NextResponse } from "next/server"
import { createSupabaseAnonClient } from "@/lib/supabase/client"

export const dynamic = "force-dynamic"

export type MediaAssetRow = {
  id: number
  bbroomid: number | null
  bbid: number | null
  entity_type: "room" | "property" | "room_type"
  entity_key: string
  source: "nightsbridge" | "site_catalog" | "upload"
  source_url: string | null
  local_path: string | null
  alt_text: string | null
  sort_order: number
  is_primary: boolean
}

/** GET /api/media — public room/property images from media_asset table */
export async function GET() {
  try {
    const supabase = createSupabaseAnonClient()
    const { data, error } = await supabase
      .from("media_asset")
      .select(
        "id, bbroomid, bbid, entity_type, entity_key, source, source_url, local_path, alt_text, sort_order, is_primary",
      )
      .order("entity_type")
      .order("sort_order")

    if (error) {
      if (error.message.includes("media_asset")) {
        return NextResponse.json({ assets: [], source: "unavailable" })
      }
      throw error
    }

    return NextResponse.json({ assets: data ?? [], source: "database" })
  } catch (err) {
    console.error("[api/media]", err)
    return NextResponse.json({ assets: [], source: "error" })
  }
}
