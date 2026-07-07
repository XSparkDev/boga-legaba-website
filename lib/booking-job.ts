/**
 * Async booking status, keyed by Paystack payment reference (migration 012).
 *
 * The booking is a ~50s Playwright job. Instead of running it inside the
 * payment-return request (which timed out → paid-but-not-booked), the worker
 * runs it in the background and records the outcome here; the website polls
 * this table. Fails soft if the table isn't applied yet.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import type { PaymentContext } from "@/lib/payment-utils"

export type BookingJobStatus = "pending" | "booked" | "failed"

export type BookingJob = {
  reference: string
  status: BookingJobStatus
  booking_id: string | null
  error: string | null
  guest_name: string | null
  guest_email: string | null
  checkin: string | null
  checkout: string | null
  room_type_name: string | null
  amount: number | null
  context: PaymentContext | Record<string, unknown>
  emails_sent: boolean
}

/** Read the booking job for a reference, or null if none / table missing. */
export async function getBookingJob(reference: string): Promise<BookingJob | null> {
  if (!reference) return null
  try {
    const sb = createSupabaseAdminClient()
    const { data, error } = await sb.from("booking_job").select("*").eq("reference", reference).maybeSingle()
    if (error) {
      console.warn("[booking-job] read failed:", error.message)
      return null
    }
    return (data as BookingJob) ?? null
  } catch (err) {
    console.warn("[booking-job] read error:", err)
    return null
  }
}

/**
 * Create the pending job for a reference if it doesn't already exist. Returns
 * "created" (we made a fresh pending row → caller should trigger the worker),
 * "exists" (a job is already tracked → do NOT re-trigger, avoids double-booking),
 * or "unavailable" (table missing / DB error → caller should fall back).
 */
export async function ensurePendingBookingJob(
  ctx: PaymentContext,
): Promise<"created" | "exists" | "unavailable"> {
  if (!ctx.reference) return "unavailable"
  try {
    const sb = createSupabaseAdminClient()

    const existing = await sb.from("booking_job").select("reference").eq("reference", ctx.reference).maybeSingle()
    if (existing.error) {
      console.warn("[booking-job] ensurePending read failed:", existing.error.message)
      return "unavailable"
    }
    if (existing.data) return "exists"

    const { error } = await sb.from("booking_job").insert({
      reference: ctx.reference,
      status: "pending",
      guest_name: ctx.guestName || null,
      guest_email: ctx.guestEmail || null,
      checkin: ctx.checkin || null,
      checkout: ctx.checkout || null,
      room_type_name: ctx.roomTypeName || null,
      amount: ctx.amountPaid ?? null,
      context: ctx,
    })
    if (error) {
      // Unique-violation → someone inserted between our read and insert. Treat
      // as "exists" so we don't double-trigger.
      if (error.code === "23505") return "exists"
      console.warn("[booking-job] ensurePending insert failed:", error.message)
      return "unavailable"
    }
    return "created"
  } catch (err) {
    console.warn("[booking-job] ensurePending error:", err)
    return "unavailable"
  }
}

/**
 * Atomically claim the right to send the outcome emails for a resolved job.
 * Sets emails_sent=true only if it was false, and returns true only to the
 * single caller that won the flip — so the emails are sent exactly once even
 * though the status endpoint may be polled many times.
 */
export async function claimEmailSend(reference: string): Promise<boolean> {
  if (!reference) return false
  try {
    const sb = createSupabaseAdminClient()
    const { data, error } = await sb
      .from("booking_job")
      .update({ emails_sent: true, updated_at: new Date().toISOString() })
      .eq("reference", reference)
      .eq("emails_sent", false)
      .select("reference")
    if (error) {
      console.warn("[booking-job] claimEmailSend failed:", error.message)
      return false
    }
    return Array.isArray(data) && data.length > 0
  } catch (err) {
    console.warn("[booking-job] claimEmailSend error:", err)
    return false
  }
}
