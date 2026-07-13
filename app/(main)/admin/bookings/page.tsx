import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { BookingsClient } from "@/components/admin/bookings-client"
import { getDepartmentBookingIds } from "@/lib/booking-extras"

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
  // extracted from raw JSON — room_name is the specific physical unit (e.g.
  // "Flutes"); room_type is the category (e.g. "Twin Room (Shower only)"),
  // kept only as a fallback for older synced rows that predate NightsBridge
  // returning a per-unit name on this endpoint.
  room_name: string | null
  room_type: string | null
  adults: number | null
  avg_rate: number | null
  checked_in: boolean
  checked_out: boolean
  // app-owned (from booking_department table, joined read-only)
  is_department: boolean
}

/**
 * A booking made on the WEBSITE (booking_job table) — pay-first flow. These may
 * not be on NightsBridge yet: `status`/`booking_id` are the NightsBridge track,
 * `booking_status` is the payment track. The admin uses these to spot paid
 * guests who still need to be pushed to NightsBridge (with a retry).
 */
export type WebsiteBooking = {
  reference: string
  guest_name: string | null
  guest_email: string | null
  guest_phone: string | null     // pulled from context — no dedicated column
  notes: string | null           // pulled from context — no dedicated column
  checkin: string | null
  checkout: string | null
  room_type_name: string | null
  room_name: string | null
  amount: number | null
  status: string | null          // NightsBridge track: processing | completed | failed
  booking_id: string | null      // NightsBridge NBID once booked
  booking_status: string | null  // payment track: PENDING | AWAITING_PAYMENT | PAYMENT_CONFIRMED | ...
  error: string | null
  created_at: string
}

async function fetchWebsiteBookings(): Promise<WebsiteBooking[]> {
  try {
    const sb = createSupabaseAdminClient()
    const { data, error } = await sb
      .from("booking_job")
      .select("reference, guest_name, guest_email, checkin, checkout, room_type_name, room_name, amount, status, booking_id, booking_status, error, created_at, context")
      .order("created_at", { ascending: false })
      .limit(100)
    if (error || !data) return []
    return data.map((row) => {
      const ctx = (row.context as Record<string, unknown>) ?? {}
      return {
        ...row,
        guest_phone: (ctx.guestPhone as string | null) ?? null,
        notes: (ctx.notes as string | null) ?? null,
      }
    }) as WebsiteBooking[]
  } catch {
    return []
  }
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

    // The raw NightsBridge booking JSON's per-stay entries reliably have
    // bbroomid (services/nightsbridge-sync/storage.py does a required
    // `stay["bbroomid"]` access when syncing) but NOT a consistent room-name
    // field across API shapes — so resolve the specific room via the `room`
    // table (kept in sync from NightsBridge, bbroomid -> room_name) instead
    // of guessing at raw JSON key names.
    const { data: roomRows } = await sb.from("room").select("bbroomid, room_name")
    const roomNameById = new Map((roomRows ?? []).map((r) => [r.bbroomid as number, r.room_name as string]))

    return data.map((b) => {
      const raw = (b.raw as Record<string, unknown>) ?? {}
      const rooms = (raw.rooms as Record<string, unknown>[] | undefined) ?? []
      const firstRoom = rooms[0] ?? {}
      const bbroomid = firstRoom.bbroomid != null ? Number(firstRoom.bbroomid) : null
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
        room_name: (bbroomid != null ? roomNameById.get(bbroomid) : undefined) ?? (firstRoom.roomname as string | null) ?? null,
        room_type: (firstRoom.roomtypename as string | null) ?? null,
        adults: (firstRoom.noadults as number | null) ?? null,
        avg_rate: (firstRoom.avgrate as number | null) ?? null,
        checked_in: !!(firstRoom.checkedin),
        checked_out: !!(firstRoom.checkedout),
        is_department: false,
      }
    })
  } catch {
    return []
  }
}

export default async function BookingsPage() {
  if (!(await isAuthenticated())) redirect("/admin/login")

  const [bookings, websiteBookings] = await Promise.all([fetchBookings(), fetchWebsiteBookings()])

  // Read-only join against the app-owned booking_department table for badges.
  const deptIds = await getDepartmentBookingIds(bookings.map((b) => b.bookingid))
  const withDept = bookings.map((b) => ({ ...b, is_department: deptIds.has(b.bookingid) }))

  return <BookingsClient bookings={withDept} websiteBookings={websiteBookings} />
}
