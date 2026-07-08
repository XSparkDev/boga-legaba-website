import { NextRequest, NextResponse } from "next/server"
import { getBookingJob, claimEmailSend } from "@/lib/booking-job"
import { releaseHold } from "@/lib/booking-holds"
import { buildGuestPendingEmail } from "@/lib/payment-utils"
import { Resend } from "resend"

export const dynamic = "force-dynamic"

/**
 * Polled by /booking/processing while the pre-payment NightsBridge booking
 * runs in the background. Once the job resolves:
 *  - booked: releases the soft hold (the room is now really booked — no need
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

  const job = await getBookingJob(reference)
  if (!job) {
    return NextResponse.json({ status: "pending" })
  }

  if (job.status === "booked" || job.status === "failed") {
    await releaseHold(reference)
  }

  if (job.status === "booked" && !job.emails_sent) {
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
    status: job.status,
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
