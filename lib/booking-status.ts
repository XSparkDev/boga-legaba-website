/**
 * Explicit, persisted state machine for the booking pipeline (migration 014).
 * booking_job.booking_status is the single source of truth for what stage a
 * booking is at — every stage transition goes through transitionBookingStatus()
 * below, which is BOTH how the state advances AND how idempotency is
 * enforced (see the guard mechanism in its docstring). Nothing should write
 * booking_job.booking_status directly.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export const BOOKING_STATUSES = [
  "PENDING",
  "NIGHTSBRIDGE_BOOKING_CREATED",
  "NIGHTSBRIDGE_VERIFIED",
  "CONFIRMATION_EMAIL_SENT",
  "AWAITING_PAYMENT",
  "PAYMENT_CONFIRMED",
  "BOGA_NOTIFIED",
  // Guest reached checkout but the payment did not succeed — Paystack sent a
  // charge.failed (declined card, insufficient funds, etc.). DISTINCT from the
  // generic FAILED so the admin can see "tried to book but payment failed".
  // Not terminal: a guest who retries a declined card can still succeed, so
  // PAYMENT_CONFIRMED remains reachable from here.
  "PAYMENT_FAILED",
  "FAILED",
] as const

export type BookingStatus = (typeof BOOKING_STATUSES)[number]

/**
 * The only legal forward transitions. Guards against a bug elsewhere
 * skipping a stage or moving backward — a transition not listed here is
 * rejected even if the caller asks for it, so the audit trail stays honest.
 * FAILED is reachable from every non-terminal stage (a booking can fail at
 * any point); BOGA_NOTIFIED and FAILED are terminal.
 */
const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  // PAY-FIRST FLOW: PENDING can now jump straight to AWAITING_PAYMENT. The
  // website drives the payment track (PENDING -> AWAITING_PAYMENT -> ...)
  // independently of the NightsBridge track (booking_job.status +
  // booking_id/room_name, driven by the worker in the background). The old
  // NIGHTSBRIDGE_* stages remain valid targets but are no longer part of the
  // guest's path to payment.
  PENDING: ["NIGHTSBRIDGE_BOOKING_CREATED", "AWAITING_PAYMENT", "FAILED"],
  NIGHTSBRIDGE_BOOKING_CREATED: ["NIGHTSBRIDGE_VERIFIED", "FAILED"],
  NIGHTSBRIDGE_VERIFIED: ["CONFIRMATION_EMAIL_SENT", "FAILED"],
  CONFIRMATION_EMAIL_SENT: ["AWAITING_PAYMENT", "FAILED"],
  AWAITING_PAYMENT: ["PAYMENT_CONFIRMED", "PAYMENT_FAILED", "FAILED"],
  // A declined payment can be retried by the guest → allow it to recover to
  // PAYMENT_CONFIRMED, or back to AWAITING_PAYMENT if they re-open checkout.
  PAYMENT_FAILED: ["PAYMENT_CONFIRMED", "AWAITING_PAYMENT", "FAILED"],
  PAYMENT_CONFIRMED: ["BOGA_NOTIFIED", "FAILED"],
  BOGA_NOTIFIED: [],
  FAILED: [],
}

function predecessorsOf(to: BookingStatus): BookingStatus[] {
  return (Object.keys(ALLOWED_TRANSITIONS) as BookingStatus[]).filter((from) =>
    ALLOWED_TRANSITIONS[from].includes(to),
  )
}

export type TransitionResult = { ok: boolean; reason?: string }

/**
 * Atomically move a booking from its current stage to `to`, IF its current
 * stage is one of the allowed predecessors (or `opts.from` if given, to
 * narrow further). The UPDATE's WHERE clause includes the expected
 * predecessor state, so this is a single round-trip compare-and-swap — the
 * database, not application logic, decides who wins a race.
 *
 * THIS is the idempotency mechanism for the whole pipeline: a duplicate
 * trigger (Paystack retrying a webhook, the browser-redirect path AND the
 * webhook both reacting to the same payment, a re-run after a crash) will
 * find the row already moved past the expected predecessor and get
 * `{ok:false}` — the caller's job is to treat that as "someone already
 * handled this, skip the side effect" rather than an error.
 */
export async function transitionBookingStatus(
  reference: string,
  to: BookingStatus,
  opts: { from?: BookingStatus[]; reason?: string } = {},
): Promise<TransitionResult> {
  if (!reference) return { ok: false, reason: "missing reference" }
  const allowedFrom = opts.from ?? predecessorsOf(to)
  if (allowedFrom.length === 0) {
    return { ok: false, reason: `no legal predecessor states defined for ${to}` }
  }

  try {
    const sb = createSupabaseAdminClient()
    const { data, error } = await sb
      .from("booking_job")
      .update({
        booking_status: to,
        booking_status_reason: opts.reason ?? null,
        booking_status_updated_at: new Date().toISOString(),
      })
      .eq("reference", reference)
      .in("booking_status", allowedFrom)
      .select("booking_status")

    if (error) {
      console.error(`[booking-status] transition FAILED reference=${reference} -> ${to}:`, error.message)
      return { ok: false, reason: error.message }
    }

    const won = Array.isArray(data) && data.length > 0
    if (!won) {
      console.log(`[booking-status] reference=${reference} transition to ${to} REJECTED — current status was not in [${allowedFrom.join(", ")}] (already processed, or in an unexpected state)`)
      return { ok: false, reason: "current status did not allow this transition" }
    }

    console.log(`[booking-status] reference=${reference} -> ${to}${opts.reason ? ` (${opts.reason})` : ""}`)
    // Best-effort audit row — never block the pipeline on this failing.
    sb.from("booking_status_history")
      .insert({ reference, to_status: to, reason: opts.reason ?? null })
      .then(({ error: histError }) => {
        if (histError) console.warn(`[booking-status] history insert failed reference=${reference}:`, histError.message)
      })

    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[booking-status] transition THREW reference=${reference} -> ${to}:`, msg)
    return { ok: false, reason: msg }
  }
}

export async function getBookingStatus(reference: string): Promise<BookingStatus | null> {
  if (!reference) return null
  try {
    const sb = createSupabaseAdminClient()
    const { data, error } = await sb.from("booking_job").select("booking_status").eq("reference", reference).maybeSingle()
    if (error || !data) return null
    return data.booking_status as BookingStatus
  } catch {
    return null
  }
}

export async function getBookingStatusHistory(reference: string) {
  if (!reference) return []
  try {
    const sb = createSupabaseAdminClient()
    const { data, error } = await sb
      .from("booking_status_history")
      .select("*")
      .eq("reference", reference)
      .order("created_at", { ascending: true })
    if (error) return []
    return data ?? []
  } catch {
    return []
  }
}
