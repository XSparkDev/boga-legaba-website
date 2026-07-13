import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { getBookingJob } from "@/lib/booking-job"
import { triggerAsyncBooking, type PaymentContext } from "@/lib/payment-utils"

export const dynamic = "force-dynamic"

async function isAuthenticated() {
  const store = await cookies()
  return store.get("bl_admin_session")?.value === process.env.ADMIN_SECRET
}

/**
 * Admin action for the "Website Bookings" table: re-push a paid-but-not-on-
 * NightsBridge booking to the worker. Pay-first flow — the guest already paid;
 * this only re-runs the background NightsBridge automation for that booking_job
 * row. Returns fast: it resets the row's NightsBridge track to "processing" and
 * fires triggerAsyncBooking (which returns as soon as the worker accepts, 202).
 */
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 })
  }

  const reference = String(body.reference ?? "").trim()
  if (!reference) {
    return NextResponse.json({ ok: false, error: "reference is required" }, { status: 400 })
  }

  const { job, dbError } = await getBookingJob(reference)
  if (dbError) {
    return NextResponse.json({ ok: false, error: `Could not read booking: ${dbError}` }, { status: 502 })
  }
  if (!job) {
    return NextResponse.json({ ok: false, error: "Booking not found" }, { status: 404 })
  }

  // Refuse to re-run an already-confirmed booking. The admin UI hides the
  // Retry button once status is "completed", but that's a client-side guard
  // only — nothing stopped this endpoint itself from being hit again (a race
  // between two tabs, a double-click before the UI re-rendered, a stale page).
  // A second Playwright run for the same reference tries to book the SAME
  // room again, finds it already taken by the first successful run, and
  // "fails" — silently overwriting status back to "failed" even though
  // booking_id already holds a real, live NightsBridge confirmation. That's
  // exactly the bug this guard closes: once booking_id is set, this endpoint
  // is a no-op that reports the existing success instead of touching anything.
  if (job.status === "completed" && job.booking_id) {
    return NextResponse.json({
      ok: true,
      reference,
      alreadyConfirmed: true,
      bookingId: job.booking_id,
    })
  }

  // Rebuild the booking payload from the row's stored context (the full
  // PaymentContext saved at /api/booking/start time), forcing the reference.
  const ctx = { ...(job.context as Record<string, unknown>), reference } as PaymentContext
  if (!ctx.roomTypeName || !ctx.checkin || !ctx.checkout) {
    return NextResponse.json(
      { ok: false, error: "Stored booking is missing room/dates — cannot retry automatically. Book it manually on NightsBridge." },
      { status: 422 },
    )
  }

  // Reset the NightsBridge track so the admin UI shows it in-flight again.
  // Best-effort — never block the retry on this write.
  try {
    const sb = createSupabaseAdminClient()
    await sb.from("booking_job").update({ status: "processing", error: null }).eq("reference", reference)
  } catch (err) {
    console.warn(`[admin/retry-nightsbridge] status reset failed reference=${reference}:`, err)
  }

  // Wake the worker BEFORE triggering the booking. Unlike /api/booking/start
  // (which fires this in the background while the guest's availability/hold
  // checks run — those absorb the wake-up time), a retry has no other work to
  // do while waiting, so this one is awaited directly. The worker sits on
  // Render's free tier and spins down after idle time; an admin retry usually
  // happens after exactly that idle window, so without this the /book call
  // below (30s timeout) can abort mid-cold-start and wrongly report the job as
  // rejected even though the worker would have accepted it once awake.
  const workerBase = (process.env.SYNC_WORKER_URL ?? "").replace(/\/run$/, "")
  if (workerBase) {
    try {
      await fetch(`${workerBase}/health`, { signal: AbortSignal.timeout(45_000) })
    } catch (err) {
      console.warn(`[admin/retry-nightsbridge] worker wake-up ping failed reference=${reference}:`, err)
    }
  }

  const accepted = await triggerAsyncBooking(ctx)
  if (!accepted) {
    return NextResponse.json(
      { ok: false, error: "The booking worker did not accept the job. Try again shortly." },
      { status: 502 },
    )
  }

  console.log(`[admin/retry-nightsbridge] reference=${reference} re-triggered NightsBridge booking`)
  return NextResponse.json({ ok: true, reference })
}
