import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * GET /api/bookings?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Protected — requires Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization")
  const expected = `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  if (!from || !to) {
    return NextResponse.json(
      { error: "Query params `from` and `to` are required (YYYY-MM-DD)." },
      { status: 400 },
    )
  }

  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from("booking")
      .select(
        `
        bookingid,
        booking_ref,
        status,
        status_text,
        source,
        from_date,
        to_date,
        is_cancelled,
        booking_room_stay (
          bbroomid,
          adults,
          avg_rate,
          room:bbroomid ( room_name, property_name )
        )
      `,
      )
      .gte("to_date", from)
      .lte("from_date", to)
      .eq("is_cancelled", false)
      .order("from_date", { ascending: true })

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error("[api/bookings]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load bookings" },
      { status: 500 },
    )
  }
}
