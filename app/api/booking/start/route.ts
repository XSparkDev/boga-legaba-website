import { NextRequest, NextResponse } from "next/server"
import { checkRoomTypeAvailableLive } from "@/lib/nightsbridge-api"
import { hasActiveHold, createHold } from "@/lib/booking-holds"
import { ensurePendingBookingJob } from "@/lib/booking-job"
import { triggerAsyncBooking, type PaymentContext } from "@/lib/payment-utils"

export const dynamic = "force-dynamic"

const NB_BBID = 21091

/**
 * BOOK-FIRST FLOW, step 1: create the real NightsBridge booking BEFORE any
 * payment is requested. Kicks off the same reliable async booking engine used
 * by the old post-payment flow (background job + booking_job table), just
 * moved earlier — the guest lands on /booking/processing to watch it complete,
 * then only afterwards gets sent to Paystack to pay for an already-real room.
 *
 * Returns fast (job accepted); the actual ~50-90s Playwright booking runs in
 * the worker's background and is tracked via /api/booking/status.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 })
  }

  const required = ["email", "checkin", "checkout", "roomTypeName", "guestName"] as const
  const missing = required.filter((k) => !body[k])
  if (missing.length) {
    return NextResponse.json({ ok: false, error: `Missing fields: ${missing.join(", ")}` }, { status: 400 })
  }

  const checkin      = String(body.checkin)
  const checkout     = String(body.checkout)
  const roomTypeName = String(body.roomTypeName)
  const bbid         = typeof body.bbid === "number" ? body.bbid : NB_BBID

  // ── Pre-warm the worker ────────────────────────────────────────────────────
  // Fire a non-blocking /health GET to wake a sleeping Render free-tier worker
  // NOW, while we run the availability/hold checks below — so by the time we
  // trigger the booking the worker is already awake (avoids a cold-start delay
  // that could otherwise push the guest's loading screen toward its time limit).
  const warmBase = (process.env.SYNC_WORKER_URL ?? "").replace(/\/run$/, "")
  if (warmBase) {
    fetch(`${warmBase}/health`, { signal: AbortSignal.timeout(10_000) }).catch(() => {})
  }

  // ── Real-time availability gate ────────────────────────────────────────────
  const live = await checkRoomTypeAvailableLive(bbid, roomTypeName, checkin, checkout)
  if (live.status === "unavailable") {
    return NextResponse.json(
      {
        ok: false,
        error: `Sorry — ${roomTypeName} was just taken for ${checkin} to ${checkout}. Please choose different dates or another room.`,
      },
      { status: 409 },
    )
  }

  // ── Soft-hold gate: is another guest already mid-booking for this room? ────
  const heldByAnother = await hasActiveHold(bbid, roomTypeName, checkin, checkout)
  if (heldByAnother) {
    return NextResponse.json(
      {
        ok: false,
        error: `${roomTypeName} is being booked by another guest right now for ${checkin} to ${checkout}. Please try again in a few minutes or choose another room.`,
      },
      { status: 409 },
    )
  }

  const reference = `BLJOB-${Date.now()}`
  await createHold({ reference, bbid, roomTypeName, checkin, checkout })

  const ctx: PaymentContext = {
    reference,
    bookingRef: reference,
    guestEmail: String(body.email),
    guestName: String(body.guestName),
    guestPhone: String(body.guestPhone ?? ""),
    checkin,
    checkout,
    roomTypeName,
    amountPaid: Number(body.amountRands ?? 0),
    mealPlanName: body.mealPlanName ? String(body.mealPlanName) : undefined,
    adults: typeof body.adults === "number" ? body.adults : undefined,
    children1: typeof body.children1 === "number" ? body.children1 : undefined,
    children2: typeof body.children2 === "number" ? body.children2 : undefined,
    firstname: body.firstname ? String(body.firstname) : undefined,
    surname: body.surname ? String(body.surname) : undefined,
    arrivalTime: body.arrivalTime ? String(body.arrivalTime) : undefined,
    airline: body.airline ? String(body.airline) : undefined,
    flightno: body.flightno ? String(body.flightno) : undefined,
    notes: body.notes ? String(body.notes) : undefined,
    bbid,
    maxAdults: typeof body.maxAdults === "number" ? body.maxAdults : undefined,
    maxOccupancy: typeof body.maxOccupancy === "number" ? body.maxOccupancy : undefined,
  }

  const jobState = await ensurePendingBookingJob(ctx)
  if (jobState === "unavailable") {
    return NextResponse.json(
      { ok: false, error: "Booking service is temporarily unavailable. Please try again shortly." },
      { status: 503 },
    )
  }

  if (jobState === "created") {
    const accepted = await triggerAsyncBooking(ctx)
    if (!accepted) {
      return NextResponse.json(
        { ok: false, error: "Could not start the booking. Please try again or contact us on WhatsApp." },
        { status: 502 },
      )
    }
  }
  // "exists" → a job for this reference is already in flight (shouldn't normally
  // happen since we just generated a fresh reference) — do NOT re-trigger.

  return NextResponse.json({ ok: true, reference })
}
