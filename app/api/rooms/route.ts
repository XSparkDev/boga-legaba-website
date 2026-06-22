import { NextResponse } from "next/server"
import { createSupabaseAnonClient } from "@/lib/supabase/client"
import { buildSyncedProperties, type SyncedRoomRow } from "@/lib/synced-rooms"

export const dynamic = "force-dynamic"

/**
 * GET /api/rooms — public room catalog from Supabase (NightsBridge sync only).
 */
export async function GET() {
  try {
    const supabase = createSupabaseAnonClient()
    const { data, error } = await supabase
      .from("room")
      .select(
        `
        bbroomid,
        bbid,
        room_name,
        property_name,
        configuration,
        bathroom_type,
        address,
        order_by,
        bbrtid,
        updated_at,
        room_type (
          rtname,
          rtdesc,
          max_adults,
          max_occupancy,
          private_bathroom,
          room_qty,
          room_size_sqm,
          rate_scheme,
          ota_room_type_code,
          raw
        )
      `,
      )
      .eq("is_active", true)
      .order("property_name", { ascending: true })
      .order("order_by", { ascending: true })
      .order("room_name", { ascending: true })

    if (error) {
      // room_type join may fail if RLS blocks it — retry without join
      if (error.message.includes("room_type")) {
        const fallback = await supabase
          .from("room")
          .select(
            "bbroomid, bbid, room_name, property_name, configuration, bathroom_type, address, order_by, bbrtid, updated_at",
          )
          .eq("is_active", true)
          .order("property_name", { ascending: true })
          .order("order_by", { ascending: true })
          .order("room_name", { ascending: true })

        if (fallback.error) throw fallback.error
        return respond(fallback.data as unknown as SyncedRoomRow[])
      }
      throw error
    }

    return respond((data ?? []) as unknown as SyncedRoomRow[])
  } catch (err) {
    console.error("[api/rooms]", err)
    return NextResponse.json(
      {
        source: "error",
        syncedAt: null,
        properties: [],
        error: err instanceof Error ? err.message : "Failed to load rooms",
      },
      { status: 200 },
    )
  }
}

function respond(rows: SyncedRoomRow[]) {
  if (!rows.length) {
    return NextResponse.json({
      source: "empty",
      syncedAt: null,
      properties: [],
    })
  }

  const latest = rows.reduce<string | null>((max, row) => {
    const ts = (row as { updated_at?: string }).updated_at
    if (!ts) return max
    return !max || ts > max ? ts : max
  }, null)

  return NextResponse.json({
    source: "database",
    syncedAt: latest,
    properties: buildSyncedProperties(rows),
  })
}
