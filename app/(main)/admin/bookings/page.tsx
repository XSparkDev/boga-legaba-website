import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { BookingsClient } from "@/components/admin/bookings-client"

export const metadata: Metadata = {
  title: "Bookings | Boga Legaba Admin",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

async function isAuthenticated() {
  const store = await cookies()
  return store.get("bl_admin_session")?.value === process.env.ADMIN_SECRET
}

export type BookingRow = {
  bookingid: number
  booking_ref: number | null
  status: string | null
  status_text: string | null
  from_date: string
  to_date: string
  made_by: string | null
  made_by_email: string | null
  made_by_phone: string | null
  notes: string | null
  // extracted from raw JSON
  room_type: string | null
  adults: number | null
  avg_rate: number | null
  checked_in: boolean
  checked_out: boolean
}

async function fetchBookings(): Promise<BookingRow[]> {
  try {
    const sb = createSupabaseAdminClient()

    // Fetch bookings — 90 days back to 180 days ahead
    const from = new Date()
    from.setDate(from.getDate() - 90)
    const to = new Date()
    to.setDate(to.getDate() + 180)

    const { data, error } = await sb
      .from("booking")
      .select("bookingid, booking_ref, status, status_text, from_date, to_date, made_by, made_by_email, made_by_phone, notes, raw")
      .eq("is_cancelled", false)
      .gte("to_date", from.toISOString().slice(0, 10))
      .lte("from_date", to.toISOString().slice(0, 10))
      .order("from_date", { ascending: true })
      .limit(300)

    if (error || !data) return []

    return data.map((b) => {
      const raw = (b.raw as Record<string, unknown>) ?? {}
      const rooms = (raw.rooms as Record<string, unknown>[] | undefined) ?? []
      const firstRoom = rooms[0] ?? {}
      return {
        bookingid: b.bookingid,
        booking_ref: b.booking_ref,
        status: b.status,
        status_text: b.status_text,
        from_date: b.from_date,
        to_date: b.to_date,
        made_by: b.made_by,
        made_by_email: b.made_by_email,
        made_by_phone: b.made_by_phone,
        notes: b.notes,
        room_type: (firstRoom.roomtypename as string | null) ?? null,
        adults: (firstRoom.noadults as number | null) ?? null,
        avg_rate: (firstRoom.avgrate as number | null) ?? null,
        checked_in: !!(firstRoom.checkedin),
        checked_out: !!(firstRoom.checkedout),
      }
    })
  } catch {
    return []
  }
}

export default async function BookingsPage() {
  if (!(await isAuthenticated())) redirect("/admin/login")

  const bookings = await fetchBookings()

  return <BookingsClient bookings={bookings} />
}
