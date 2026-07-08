import { NextRequest, NextResponse } from "next/server"
import { getBookingJob, claimEmailSend } from "@/lib/booking-job"
import { releaseHold } from "@/lib/booking-holds"
import { buildGuestPendingEmail } from "@/lib/payment-utils"
import { Resend } from "resend"

export const dynamic = "force-dynamic"

/**
 * Polled by /booking/processing while the pre-payment NightsBridge booking
 * runs in the background. Once the job resolves:
 *  - completed: releases the soft hold (the room is now really booked — no need
 *    to block other guests), sends the guest a "your room is reserved, redirecting
 *    to payment" email exactly once, and reports the real NightsBridge booking
 *    reference back to the page so it can hand off to Paystack.
 *  - failed: releases the hold and reports the error so the page can offer a retry.
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

  if (status === "completed" && !job.emails_sent) {
    const won = await claimEmailSend(reference)
    if (won) {
      const resendKey = process.env.RESEND_API_KEY
      if (resendKey && resendKey !== "re_REPLACE_ME" && job.guest_email) {
        try {
          const resend = new Resend(resendKey)
          const from = process.env.RESEND_FROM_EMAIL ?? "Boga Legaba <onboarding@resend.dev>"
          await resend.emails.send({
            from,
            to: job.guest_email,
            subject: "Your room is reserved – complete payment – Boga Legaba",
            html: buildGuestPendingEmail({
              guestName: job.guest_name ?? "",
              bookingRef: job.booking_id ?? "",
              checkin: job.checkin ?? "",
              checkout: job.checkout ?? "",
              roomTypeName: job.room_type_name ?? "",
              estimatedTotal: job.amount ? `R ${Number(job.amount).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}` : "",
            }),
          })
        } catch (err) {
          console.error("[booking/status] Guest pending email error:", err)
        }
      }
    }
  }

  return NextResponse.json({
    status,
    bookingRef: job.booking_id ?? "",
    error: job.error ?? "",
    guestName: job.guest_name ?? "",
    guestEmail: job.guest_email ?? "",
    checkin: job.checkin ?? "",
    checkout: job.checkout ?? "",
    roomTypeName: job.room_type_name ?? "",
    amount: job.amount ?? "",
  })
}
