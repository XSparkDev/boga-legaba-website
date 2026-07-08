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

// "processing": worker thread accepted the job, Playwright run may still be in
// flight. "completed": the NightsBridge booking genuinely succeeded — a real
// booking_id was scraped from the confirmation page and written here. Only
// "completed" means it's safe to send the guest to payment.
export type BookingJobStatus = "processing" | "completed" | "failed"

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

/**
 * Read the booking job for a reference.
 *
 * IMPORTANT (fix for the "stuck on Reserving your room" bug): this used to
 * return `null` for BOTH "no row exists yet" AND "the DB read itself failed"
 * (bad credentials, RLS denial, network error, table missing). The caller
 * (/api/booking/status) treated any null as "processing" — so a PERSISTENT read
 * failure looked identical to "still booking" and polling would never
 * progress, silently, forever. Now a real error is distinguishable via the
 * `dbError` field so it can be logged/surfaced instead of masked.
 */
export async function getBookingJob(
  reference: string,
): Promise<{ job: BookingJob | null; dbError: string | null }> {
  if (!reference) return { job: null, dbError: null }
  try {
    const sb = createSupabaseAdminClient()
    const { data, error } = await sb.from("booking_job").select("*").eq("reference", reference).maybeSingle()
    if (error) {
      console.error(`[booking-job] read FAILED for reference=${reference}:`, error.message)
      return { job: null, dbError: error.message }
    }
    console.log(`[booking-job] read reference=${reference} -> status=${(data as BookingJob | null)?.status ?? "NOT_FOUND"}`)
    return { job: (data as BookingJob) ?? null, dbError: null }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[booking-job] read THREW for reference=${reference}:`, msg)
    return { job: null, dbError: msg }
  }
}

/**
 * Create the processing job for a reference if it doesn't already exist.
 * Returns "created" (we made a fresh row → caller should trigger the worker),
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
      console.error(`[booking-job] ensurePending READ FAILED reference=${ctx.reference}:`, existing.error.message)
      return "unavailable"
    }
    if (existing.data) {
      console.log(`[booking-job] ensurePending reference=${ctx.reference} -> exists (not re-triggering)`)
      return "exists"
    }

    const { error } = await sb.from("booking_job").insert({
      reference: ctx.reference,
      status: "processing",
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
      if (error.code === "23505") {
        console.log(`[booking-job] ensurePending reference=${ctx.reference} -> race, treating as exists`)
        return "exists"
      }
      console.error(`[booking-job] ensurePending INSERT FAILED reference=${ctx.reference}:`, error.message)
      return "unavailable"
    }
    console.log(`[booking-job] ensurePending reference=${ctx.reference} -> created (status=processing)`)
    return "created"
  } catch (err) {
    console.error(`[booking-job] ensurePending THREW reference=${ctx.reference}:`, err)
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
