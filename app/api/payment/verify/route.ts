import { NextRequest, NextResponse } from "next/server"
import { sendAdminPaymentEmail, sendGuestConfirmationEmail, type PaymentContext } from "@/lib/payment-utils"
import { settleGuestConfirmation } from "@/lib/booking-emails"
import { transitionBookingStatus } from "@/lib/booking-status"
import { getBookingJob } from "@/lib/booking-job"

export const dynamic = "force-dynamic"

type BookingMeta = {
  bookingRef?: string
  internalReference?: string
  guestEmail?: string
  guestName?: string
  guestPhone?: string
  checkin?: string
  checkout?: string
  roomTypeName?: string
  roomName?: string
}

/**
 * BOOK-FIRST FLOW, step 3: Paystack redirects here after the guest pays. The
 * room was already booked on NightsBridge in step 1 (see /api/booking/start) —
 * this just verifies the payment and sends the final confirmation email. If
 * payment fails or is abandoned here, the booking is left as-is (the guest
 * already has NightsBridge's own reservation email) — nothing is auto-cancelled.
 *
 * Same AWAITING_PAYMENT -> PAYMENT_CONFIRMED guarded transition as the
 * webhook (see lib/booking-status.ts + the matching comment in
 * app/api/payment/webhook/route.ts) — this is the browser-redirect path, the
 * webhook is the server-to-server path, and whichever gets here first wins
 * the compare-and-swap. The other skips the emails but still redirects the
 * guest to the success page.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get("reference") ?? searchParams.get("trxref")

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${request.headers.get("host")}`
  const secretKey = process.env.PAYSTACK_SECRET_KEY

  const fail = (bookingRef = "") =>
    NextResponse.redirect(
      new URL(`/payment/failed?bookingRef=${encodeURIComponent(bookingRef)}`, siteUrl),
    )

  if (!secretKey || !reference) return fail()

  let amountPaid = 0
  let meta: BookingMeta = {}
  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    })
    const data = (await res.json()) as {
      status: boolean
      data?: { status: string; amount: number; metadata?: { booking?: BookingMeta } }
    }
    if (!data.status || data.data?.status !== "success") return fail(meta.bookingRef)
    amountPaid = (data.data?.amount ?? 0) / 100
    meta = data.data?.metadata?.booking ?? {}
  } catch {
    return fail()
  }

  const internalReference = meta.internalReference || ""

  // The exact physical unit (e.g. "Beads", "Blue Clouds") isn't known yet when
  // Paystack's session was created — it's assigned by NightsBridge and written
  // to booking_job.room_name once the background booking job finishes, usually
  // well before the guest completes checkout. Prefer it here; fall back to
  // whatever (if anything) made it into Paystack's metadata.
  let roomName = meta.roomName || undefined
  if (internalReference) {
    const { job } = await getBookingJob(internalReference)
    roomName = job?.room_name || roomName
  }

  const ctx: PaymentContext = {
    reference: internalReference || reference,
    bookingRef: meta.bookingRef ?? "",
    guestEmail: meta.guestEmail ?? "",
    guestName: meta.guestName ?? "",
    guestPhone: meta.guestPhone ?? "",
    checkin: meta.checkin ?? "",
    checkout: meta.checkout ?? "",
    roomTypeName: meta.roomTypeName ?? "",
    roomName,
    amountPaid,
  }

  if (!internalReference) {
    console.error(`[payment/verify] paystackRef=${reference} has no internalReference in metadata — cannot drive the state machine (old/manual transaction?), sending emails unconditionally as a best-effort fallback`)
    await sendAdminPaymentEmail(ctx)
    await sendGuestConfirmationEmail(ctx)
  } else {
    const claimed = await transitionBookingStatus(internalReference, "PAYMENT_CONFIRMED", {
      from: ["AWAITING_PAYMENT"],
      reason: `Guest browser redirect (paystackRef=${reference})`,
    })
    if (claimed.ok) {
      // Boga is notified IMMEDIATELY on payment success — never gated on the
      // NightsBridge booking, so they can act (e.g. Retry) if it hasn't landed.
      await sendAdminPaymentEmail(ctx)
      await transitionBookingStatus(internalReference, "BOGA_NOTIFIED", { from: ["PAYMENT_CONFIRMED"] })
    } else {
      console.log(`[payment/verify] internalRef=${internalReference} PAYMENT_CONFIRMED transition rejected (${claimed.reason}) — already processed via webhook, skipping duplicate admin email`)
    }
    // Guest email is held until the NightsBridge booking has resolved. Attempt
    // it now (common case: NightsBridge already finished while the guest paid);
    // if not yet resolved, the worker's completion ping / a later poll sends it.
    const g = await settleGuestConfirmation(internalReference)
    console.log(`[payment/verify] internalRef=${internalReference} guest email: ${g.reason}`)
  }

  const successUrl = new URL(
    `/payment/success?bookingRef=${encodeURIComponent(ctx.bookingRef)}` +
      `&guestName=${encodeURIComponent(ctx.guestName)}` +
      `&checkin=${encodeURIComponent(ctx.checkin)}` +
      `&checkout=${encodeURIComponent(ctx.checkout)}` +
      `&roomTypeName=${encodeURIComponent(ctx.roomTypeName)}` +
      `&roomName=${encodeURIComponent(ctx.roomName ?? "")}` +
      `&amount=${amountPaid}`,
    siteUrl,
  )
  return NextResponse.redirect(successUrl)
}
