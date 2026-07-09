/**
 * Short-lived "soft holds" on a room type + date range while a guest pays.
 *
 * Purpose: close the double-booking gap in the pay-first flow. When payment is
 * initiated we place a hold; the availability gate refuses a second guest for an
 * overlapping stay while that hold is active. Holds carry an `expires_at` (default
 * 15 min) and are ignored once expired, so an abandoned checkout releases the room
 * automatically — no cron required. The hold is deleted explicitly once the
 * booking is created (or the payment/booking fails).
 *
 * Backed by the `booking_hold` table (supabase/migrations/008_booking_hold.sql).
 * If that table doesn't exist yet, these helpers fail OPEN (they never block a
 * real booking) and log a warning — the hold feature is simply inert until the
 * migration is applied.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

const HOLD_MINUTES = 15

function normalizeName(s: string): string {
  return (s ?? "").replace(/\s+/g, " ").trim().toLowerCase()
}

/**
 * True if an active (non-expired) hold exists for this room type whose date
 * range overlaps [checkin, checkout). Fails OPEN (returns false) on any error.
 */
export async function hasActiveHold(
  bbid: number,
  roomTypeName: string,
  checkin: string,
  checkout: string,
  opts?: { ignoreReference?: string },
): Promise<boolean> {
  try {
    const sb = createSupabaseAdminClient()
    const nowIso = new Date().toISOString()

    // Overlap rule: existing.checkin < new.checkout AND existing.checkout > new.checkin
    let query = sb
      .from("booking_hold")
      .select("reference, room_type_name, checkin, checkout")
      .eq("bbid", bbid)
      .gt("expires_at", nowIso)
      .lt("checkin", checkout)
      .gt("checkout", checkin)

    if (opts?.ignoreReference) query = query.neq("reference", opts.ignoreReference)

    const { data, error } = await query
    if (error) {
      console.warn("[booking-hold] hasActiveHold read failed (failing open):", error.message)
      return false
    }

    const target = normalizeName(roomTypeName)
    const rows = data ?? []
    // Exact match first — falling straight to substring matching risks a hold
    // on a differently-named-but-similar room (e.g. "Double Room (Bath)" vs
    // "Double Room (Bath & Shower)") wrongly blocking this booking.
    if (rows.some((h) => normalizeName(h.room_type_name as string) === target)) return true
    return rows.some((h) => {
      const held = normalizeName(h.room_type_name as string)
      return held.includes(target) || target.includes(held)
    })
  } catch (err) {
    console.warn("[booking-hold] hasActiveHold error (failing open):", err)
    return false
  }
}

/**
 * Place a hold for this room/date range, keyed by the Paystack reference.
 * Expires in HOLD_MINUTES. Best-effort — never throws.
 */
export async function createHold(params: {
  reference: string
  bbid: number
  roomTypeName: string
  checkin: string
  checkout: string
}): Promise<void> {
  try {
    const sb = createSupabaseAdminClient()
    const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString()
    const { error } = await sb.from("booking_hold").upsert(
      {
        reference:      params.reference,
        bbid:           params.bbid,
        room_type_name: params.roomTypeName,
        checkin:        params.checkin,
        checkout:       params.checkout,
        expires_at:     expiresAt,
      },
      { onConflict: "reference" },
    )
    if (error) console.warn("[booking-hold] createHold failed:", error.message)
  } catch (err) {
    console.warn("[booking-hold] createHold error:", err)
  }
}

/** Release a hold by its Paystack reference. Best-effort — never throws. */
export async function releaseHold(reference: string): Promise<void> {
  if (!reference) return
  try {
    const sb = createSupabaseAdminClient()
    const { error } = await sb.from("booking_hold").delete().eq("reference", reference)
    if (error) console.warn("[booking-hold] releaseHold failed:", error.message)
  } catch (err) {
    console.warn("[booking-hold] releaseHold error:", err)
  }
}

export const HOLD_EXPIRY_MINUTES = HOLD_MINUTES
