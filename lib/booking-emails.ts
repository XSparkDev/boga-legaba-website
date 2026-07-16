/**
 * Guest confirmation email — the SECOND, deliberately-delayed half of the
 * split done in the pay-first flow:
 *
 *   - Boga (admin) is emailed the instant Paystack confirms payment
 *     (sendAdminPaymentEmail, from /api/payment/{verify,webhook}).
 *   - The GUEST is emailed here, but only once their NightsBridge booking has
 *     RESOLVED — so the "Payment Confirmed" email shows the real, confirmed
 *     room (e.g. "Red Room") rather than a still-in-progress booking.
 *
 * The BOGA_NOTIFIED -> GUEST_CONFIRMED transition is the atomic, once-only
 * claim: whichever trigger observes both "payment confirmed" (booking reached
 * BOGA_NOTIFIED) and "NightsBridge resolved" first sends the email; every other
 * trigger finds the row already at GUEST_CONFIRMED and no-ops. That's why this
 * is safe to call from several places (payment verify, payment webhook, the
 * status poll, and the worker's completion ping) — whichever wins the race
 * sends exactly one email.
 */
import { getBookingJob } from "@/lib/booking-job"
import { transitionBookingStatus } from "@/lib/booking-status"
import { sendGuestConfirmationEmail, type PaymentContext } from "@/lib/payment-utils"

export async function settleGuestConfirmation(
  reference: string,
): Promise<{ sent: boolean; reason: string }> {
  if (!reference) return { sent: false, reason: "missing reference" }

  const { job, dbError } = await getBookingJob(reference)
  if (dbError) return { sent: false, reason: `db error: ${dbError}` }
  if (!job) return { sent: false, reason: "no booking_job row" }

  // Normalize the worker's legacy status values (old worker wrote
  // "pending"/"booked" before the rename).
  const raw = job.status as string
  const nbStatus = raw === "booked" ? "completed" : raw === "pending" ? "processing" : raw

  // Hold the guest email until NightsBridge has RESOLVED. "completed" → we can
  // show the exact room name. "failed" → Boga has already been alerted (admin
  // email) and will retry, but the guest still paid, so they should get their
  // confirmation (falling back to the room type) rather than silence. Still
  // "processing" → not yet; a later trigger will handle it.
  if (nbStatus !== "completed" && nbStatus !== "failed") {
    return { sent: false, reason: `nightsbridge not resolved (status=${nbStatus})` }
  }

  // Atomic once-only claim. Predecessor BOGA_NOTIFIED guarantees payment was
  // already confirmed AND the admin email already sent before we email the
  // guest. If it's not at BOGA_NOTIFIED (payment not yet confirmed, or the
  // guest email already went out), this returns ok:false and we simply skip.
  const claimed = await transitionBookingStatus(reference, "GUEST_CONFIRMED", {
    from: ["BOGA_NOTIFIED"],
    reason: `guest confirmation email (nb=${nbStatus})`,
  })
  if (!claimed.ok) {
    return { sent: false, reason: `not claimed (${claimed.reason ?? "already sent or payment not confirmed"})` }
  }

  const saved = (job.context ?? {}) as Partial<PaymentContext>
  const ctx: PaymentContext = {
    ...saved,
    reference,
    // Prefer the real NightsBridge booking number now that it exists.
    bookingRef: job.booking_id || saved.bookingRef || reference,
    guestEmail: job.guest_email ?? saved.guestEmail ?? "",
    guestName: job.guest_name ?? saved.guestName ?? "",
    guestPhone: saved.guestPhone ?? "",
    checkin: job.checkin ?? saved.checkin ?? "",
    checkout: job.checkout ?? saved.checkout ?? "",
    roomTypeName: job.room_type_name ?? saved.roomTypeName ?? "",
    roomName: job.room_name ?? saved.roomName ?? undefined,
    amountPaid: job.amount != null ? Number(job.amount) : (saved.amountPaid ?? 0),
  }

  await sendGuestConfirmationEmail(ctx)
  console.log(
    `[booking-emails] reference=${reference} guest confirmation sent ` +
    `(nb=${nbStatus}, room=${ctx.roomName ?? ctx.roomTypeName})`,
  )
  return { sent: true, reason: "sent" }
}
