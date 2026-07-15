import { NextRequest, NextResponse } from "next/server"
import { checkRoomTypeAvailableLive } from "@/lib/nightsbridge-api"
import { hasActiveHold, createHold } from "@/lib/booking-holds"
import { ensurePendingBookingJob, savePaystackUrl, getBookingJob } from "@/lib/booking-job"
import { triggerAsyncBooking, initiatePaystackPayment, type PaymentContext } from "@/lib/payment-utils"
import { transitionBookingStatus } from "@/lib/booking-status"

export const dynamic = "force-dynamic"

const NB_BBID = 21091

/**
 * PAY-FIRST FLOW, step 1: set the guest up to pay IMMEDIATELY, and fire the
 * NightsBridge booking off in the background (best-effort). Two independent
 * tracks on the one booking_job row:
 *   - Payment track  = booking_status (PENDING -> AWAITING_PAYMENT -> ...),
 *     driven here + by /api/payment/{verify,webhook}.
 *   - NightsBridge track = booking_job.status + booking_id/room_name, driven by
 *     the worker in the background. The admin page surfaces "not yet on
 *     NightsBridge" until it completes, and can retry it.
 *
 * The guest no longer waits ~50-90s for NightsBridge before paying — we keep
 * only the fast live-availability gate, then generate the Paystack session and
 * return its URL so the widget can redirect straight to checkout.
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
  console.log(`[booking/start] reference=${reference} creating hold room=${roomTypeName} ${checkin}->${checkout}`)
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
  console.log(`[booking/start] reference=${reference} ensurePendingBookingJob -> ${jobState}`)
  if (jobState === "unavailable") {
    console.error(`[booking/start] reference=${reference} ABORTING: booking_job unavailable (DB/table issue)`)
    return NextResponse.json(
      { ok: false, error: "Booking service is temporarily unavailable. Please try again shortly." },
      { status: 503 },
    )
  }

  // "exists" → a job for this reference is already in flight (shouldn't normally
  // happen since we just generated a fresh reference). Don't re-trigger or
  // re-generate a second Paystack session — just hand back the one already saved.
  if (jobState === "exists") {
    const { job } = await getBookingJob(reference)
    const existingUrl = (job?.context as { paystackUrl?: string } | null)?.paystackUrl ?? ""
    return NextResponse.json({ ok: true, reference, paymentUrl: existingUrl })
  }

  // ── Fire the NightsBridge booking in the BACKGROUND (best-effort) ──────────
  // Pay-first: we do NOT block on it and do NOT fail the guest if the worker is
  // unreachable. The booking_job.status track stays "processing"; the admin
  // page shows "not yet on NightsBridge" and offers a Retry.
  triggerAsyncBooking(ctx)
    .then((accepted) => console.log(`[booking/start] reference=${reference} background worker trigger accepted=${accepted}`))
    .catch((err) => console.error(`[booking/start] reference=${reference} background worker trigger error:`, err))

  // ── Fast path: create the Paystack session and move onto the payment track ──
  const amountRands = Number(body.amountRands ?? 0)
  let paymentUrl = ""
  if (amountRands > 0) {
    const payment = await initiatePaystackPayment({
      email: ctx.guestEmail,
      amountRands,
      bookingRef: reference,        // no NightsBridge NBID yet — use the internal ref
      internalReference: reference, // drives the state machine from verify/webhook
      guestName: ctx.guestName,
      guestPhone: ctx.guestPhone,
      checkin,
      checkout,
      roomTypeName,
    })
    if (payment.ok) {
      paymentUrl = payment.authorization_url
      await savePaystackUrl(reference, paymentUrl)
    } else {
      console.error(`[booking/start] reference=${reference} Paystack init failed: ${payment.error}`)
    }
  }

  // Onto the payment track immediately — independent of the NightsBridge track.
  await transitionBookingStatus(reference, "AWAITING_PAYMENT", { from: ["PENDING"] })

  // No "complete your payment" pre-payment email — the guest already has
  // Paystack checkout open. They get exactly ONE email, "Payment Confirmed",
  // once the payment actually succeeds (see /api/payment/verify + webhook).

  console.log(`[booking/start] reference=${reference} SUCCESS — payment ready (paymentUrl=${paymentUrl ? "yes" : "no"}), NightsBridge running in background`)
  return NextResponse.json({ ok: true, reference, paymentUrl })
}
