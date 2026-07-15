import { NextRequest, NextResponse } from "next/server"
import { getBookingJob, savePaystackUrl } from "@/lib/booking-job"
import { releaseHold } from "@/lib/booking-holds"
import { initiatePaystackPayment } from "@/lib/payment-utils"
import { transitionBookingStatus, type BookingStatus } from "@/lib/booking-status"

export const dynamic = "force-dynamic"

/**
 * Polled by /booking/processing while the pre-payment NightsBridge booking
 * runs in the background. Drives the booking_status state machine (see
 * lib/booking-status.ts) forward as far as it can go on each poll:
 *
 *   NIGHTSBRIDGE_VERIFIED -> CONFIRMATION_EMAIL_SENT -> AWAITING_PAYMENT
 *
 * The transition INTO CONFIRMATION_EMAIL_SENT is the atomic claim on "send
 * the guest email + generate the Paystack session" — only the poll that wins
 * that compare-and-swap does it, so it happens exactly once no matter how
 * many times this endpoint is polled or if the process restarts mid-way
 * (the next poll just finds booking_status already past that point and skips
 * straight to reading back the stored payment URL).
 */
export async function GET(request: NextRequest) {
  const reference = new URL(request.url).searchParams.get("reference") ?? ""
  if (!reference) {
    return NextResponse.json({ status: "unknown", error: "Missing reference" }, { status: 400 })
  }

  const { job, dbError } = await getBookingJob(reference)

  if (dbError) {
    // A genuine DB read failure (bad credentials, RLS denial, connection
    // issue) — NOT the same as "the job just hasn't resolved yet". Reported
    // as "processing" on the wire (a transient blip shouldn't fail the guest's
    // booking), but logged loudly and distinctly so a PERSISTENT failure is
    // immediately visible in server logs instead of looking identical to a
    // slow-but-healthy booking.
    console.error(`[booking/status] DB READ ERROR reference=${reference}: ${dbError} — reporting 'processing' to avoid failing on a transient blip`)
    return NextResponse.json({ status: "processing" })
  }

  if (!job) {
    return NextResponse.json({ status: "processing" })
  }

  // The sync-worker service (services/sync-worker/server.py) is deployed
  // independently of this app. Until it's redeployed with the matching
  // rename, it still writes the old "pending"/"booked" values — normalize
  // those here so a real success/in-progress isn't misread as unresolved
  // regardless of which side has deployed the rename first.
  const rawStatus = job.status as string
  const status = rawStatus === "booked" ? "completed" : rawStatus === "pending" ? "processing" : job.status

  if (status === "completed" || status === "failed") {
    await releaseHold(reference)
  }

  let bookingStatus = job.booking_status as BookingStatus | undefined

  // Self-healing bridge: catches TWO distinct scenarios where the legacy
  // `status` signal says the booking is genuinely done but booking_status
  // hasn't caught up, so a real, successful booking still reaches the guest
  // instead of hanging forever:
  //  (a) booking_status is missing entirely — migration 014 hasn't been
  //      applied yet, so the column doesn't exist and Supabase never
  //      returns it.
  //  (b) booking_status IS present (the migration ran, so it defaults to
  //      'PENDING') but stuck there or at NIGHTSBRIDGE_BOOKING_CREATED,
  //      because whichever worker process wrote status="completed" is still
  //      running OLD code that doesn't know about booking_status at all and
  //      so never advances it. A plain `!bookingStatus` check misses this —
  //      the value is a real, present, non-empty string, just an early one.
  // Both are exactly the failure mode that caused the original "stuck on
  // Reserving your room, no email, no redirect" bug.
  const STAGES_BEFORE_VERIFIED: BookingStatus[] = ["PENDING", "NIGHTSBRIDGE_BOOKING_CREATED"]
  if (status === "completed" && job.booking_id && (!bookingStatus || STAGES_BEFORE_VERIFIED.includes(bookingStatus))) {
    console.warn(`[booking/status] reference=${reference} booking_status is ${bookingStatus ?? "missing"} despite legacy status=completed (old worker code, or migration 014 not applied?) — bridging to NIGHTSBRIDGE_VERIFIED`)
    bookingStatus = "NIGHTSBRIDGE_VERIFIED"
  }

  // The worker writes status=failed but doesn't know about booking_status
  // (Python side transitions its own successful stages — see server.py — but
  // a hard failure there is simplest to catch here where we already read the
  // row). FAILED is a legal target from every non-terminal stage, so this
  // transition succeeds regardless of exactly where it died.
  if (status === "failed" && bookingStatus !== "FAILED") {
    await transitionBookingStatus(reference, "FAILED", { reason: job.error ?? "booking failed" })
    bookingStatus = "FAILED"
  }

  // Staleness watchdog: if this booking has been stuck in a non-terminal
  // stage for far longer than a real booking should ever take, something
  // died silently (the worker's background thread was killed by a Render
  // restart/redeploy mid-flight, a crash before it could write anything,
  // etc.) — treat it as failed so the guest gets an actionable error instead
  // of "Reserving your room…" forever, and no one contact-less waits on an
  // email/redirect that will never come.
  const STALE_MS = 6 * 60_000 // well past the ~50-90s typical booking duration
  const ageMs = Date.now() - new Date(job.created_at).getTime()
  if (bookingStatus && bookingStatus !== "FAILED" && bookingStatus !== "BOGA_NOTIFIED" && bookingStatus !== "AWAITING_PAYMENT" && ageMs > STALE_MS) {
    console.error(`[booking/status] reference=${reference} STALE (${Math.round(ageMs / 1000)}s in ${bookingStatus}) — marking FAILED so the guest isn't stuck loading forever`)
    await transitionBookingStatus(reference, "FAILED", { reason: `Stale — stuck in ${bookingStatus} for ${Math.round(ageMs / 1000)}s` })
    bookingStatus = "FAILED"
  }

  // Read back a Paystack URL already generated by an earlier ("winning") poll,
  // so every poll after the first can still hand the guest the SAME link.
  let paymentUrl = (job.context as { paystackUrl?: string } | null)?.paystackUrl || ""

  if (bookingStatus === "NIGHTSBRIDGE_VERIFIED") {
    const claimed = await transitionBookingStatus(reference, "CONFIRMATION_EMAIL_SENT", {
      from: ["NIGHTSBRIDGE_VERIFIED"],
    })
    if (claimed.ok) {
      // Generate the ONE Paystack session for this booking here, server-side,
      // so it can be embedded in the email AND returned for the redirect —
      // never two separate sessions for the same booking.
      const amountRands = job.amount ? Number(job.amount) : 0
      if (job.guest_email && amountRands > 0) {
        const payment = await initiatePaystackPayment({
          email: job.guest_email,
          amountRands,
          bookingRef: job.booking_id ?? reference,
          internalReference: reference,
          guestName: job.guest_name ?? "",
          checkin: job.checkin ?? "",
          checkout: job.checkout ?? "",
          roomTypeName: job.room_type_name ?? "",
          roomName: job.room_name ?? "",
        })
        if (payment.ok) {
          paymentUrl = payment.authorization_url
          await savePaystackUrl(reference, paymentUrl)
        } else {
          console.error(`[booking/status] Paystack pre-generation failed reference=${reference}: ${payment.error}`)
        }
      }

      // No pre-payment "reserved – complete payment" email here either — the
      // guest gets exactly ONE email, "Payment Confirmed", once payment
      // actually succeeds (see /api/payment/verify + webhook).

      await transitionBookingStatus(reference, "AWAITING_PAYMENT", { from: ["CONFIRMATION_EMAIL_SENT"] })
      bookingStatus = "AWAITING_PAYMENT"
    }
  }

  return NextResponse.json({
    status,
    bookingStatus,
    bookingRef: job.booking_id ?? "",
    error: job.error ?? "",
    guestName: job.guest_name ?? "",
    guestEmail: job.guest_email ?? "",
    checkin: job.checkin ?? "",
    checkout: job.checkout ?? "",
    roomTypeName: job.room_type_name ?? "",
    roomName: job.room_name ?? "",
    amount: job.amount ?? "",
    paymentUrl,
  })
}
