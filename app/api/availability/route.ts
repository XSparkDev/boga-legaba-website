import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAnonClient } from "@/lib/supabase/client"

export const dynamic = "force-dynamic"

export type AvailabilityRow = {
  room_name: string
  property_name: string | null
  check_date: string
  is_available: boolean
  rate: number | null
  status: string | null
  booking_ref: number | null
}

/**
 * GET /api/availability?from=YYYY-MM-DD&to=YYYY-MM-DD&room_name=Beads
 * Public — reads availability_cache joined with room (anon key + RLS).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const roomName = searchParams.get("room_name")

  if (!from || !to) {
    return NextResponse.json(
      { error: "Query params `from` and `to` are required (YYYY-MM-DD)." },
      { status: 400 },
    )
  }

  try {
    const supabase = createSupabaseAnonClient()

    let roomQuery = supabase.from("room").select("bbroomid, room_name, property_name").eq("is_active", true)
    if (roomName) {
      roomQuery = roomQuery.eq("room_name", roomName)
    }
    const { data: rooms, error: roomError } = await roomQuery
    if (roomError) throw roomError
    if (!rooms?.length) {
      return NextResponse.json([])
    }

    const roomIds = rooms.map((r) => r.bbroomid)
    const roomById = new Map(rooms.map((r) => [r.bbroomid, r]))

    const { data: cache, error: cacheError } = await supabase
      .from("availability_cache")
      .select("bbroomid, check_date, is_available, rate, status, booking_ref")
      .in("bbroomid", roomIds)
      .gte("check_date", from)
      .lte("check_date", to)
      .order("check_date", { ascending: true })

    if (cacheError) throw cacheError

    const rows: AvailabilityRow[] = (cache ?? []).map((row) => {
      const room = roomById.get(row.bbroomid)
      return {
        room_name: room?.room_name ?? "",
        property_name: room?.property_name ?? null,
        check_date: row.check_date,
        is_available: row.is_available,
        rate: row.rate != null ? Number(row.rate) : null,
        status: row.status,
        booking_ref: row.booking_ref,
      }
    })

    return NextResponse.json(rows)
  } catch (err) {
    console.error("[api/availability]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load availability" },
      { status: 500 },
    )
  }
}
