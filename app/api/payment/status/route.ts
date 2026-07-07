import { NextRequest, NextResponse } from "next/server"
import { getBookingJob, claimEmailSend } from "@/lib/booking-job"
import { sendBookingOutcomeEmails, type PaymentContext } from "@/lib/payment-utils"

export const dynamic = "force-dynamic"

/**
 * Polled by the /payment/processing loading page. Returns the current status of
 * the async booking (pending | booked | failed) for a payment reference.
 *
 * When the job first resolves, this also sends the guest + admin outcome emails
 * exactly once (guarded by an atomic emails_sent flip), so email delivery does
 * not depend on the guest keeping the page open beyond the first resolved poll.
 */
export async function GET(request: NextRequest) {
  const reference = new URL(request.url).searchParams.get("reference") ?? ""
  if (!reference) {
    return NextResponse.json({ status: "unknown", error: "Missing reference" }, { status: 400 })
  }

  const job = await getBookingJob(reference)
  if (!job) {
    // Not recorded yet (job row still being created) — tell the page to keep polling.
    return NextResponse.json({ status: "pending" })
  }

  // Fire the outcome emails once, the first time we see a resolved job.
  if ((job.status === "booked" || job.status === "failed") && !job.emails_sent) {
    const won = await claimEmailSend(reference)
    if (won) {
      const ctx = { ...(job.context as PaymentContext) }
      // Make sure the confirmation email shows the real NightsBridge ref.
      if (job.booking_id) ctx.bookingRef = job.booking_id
      await sendBookingOutcomeEmails(ctx, job.status === "booked")
    }
  }

  return NextResponse.json({
    status: job.status,
    bookingRef: job.booking_id ?? "",
    guestName: job.guest_name ?? "",
    checkin: job.checkin ?? "",
    checkout: job.checkout ?? "",
    roomTypeName: job.room_type_name ?? "",
    amount: job.amount ?? "",
  })
}
