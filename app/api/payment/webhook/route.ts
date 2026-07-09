/**
 * Paystack webhook handler — server-to-server event fired by Paystack regardless
 * of whether the guest's browser completes the redirect.
 *
 * BOOK-FIRST FLOW: the NightsBridge booking is created BEFORE payment is ever
 * requested (see /api/booking/start), so there's no booking-creation race to
 * guard against here. This IS, however, the authoritative, reliable trigger
 * for the guest-confirmation + admin (Boga) notification emails — gated on
 * this verified server-to-server event rather than on the guest's browser
 * completing the redirect back to /api/payment/verify, which never fires if
 * they close the tab right after paying on Paystack's hosted page.
 *
 * Idempotency against the booking_status state machine (see
 * lib/booking-status.ts): the AWAITING_PAYMENT -> PAYMENT_CONFIRMED
 * transition is the atomic claim. If Paystack retries this webhook, or the
 * guest's browser redirect (/api/payment/verify) also fires for the same
 * payment, whichever request wins the compare-and-swap sends the emails;
 * the other finds booking_status already past AWAITING_PAYMENT and skips —
 * checking current STATE, not just "have we seen this payment ID before".
 */
import { NextRequest, NextResponse } from "next/server"
import { createHmac } from "crypto"
import { sendPaymentConfirmedEmails, type PaymentContext } from "@/lib/payment-utils"
import { transitionBookingStatus } from "@/lib/booking-status"

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

export async function POST(request: NextRequest) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    return NextResponse.json({ ok: false, error: "Not configured" }, { status: 503 })
  }

  // ── Verify Paystack signature ─────────────────────────────────────────────
  const sig  = request.headers.get("x-paystack-signature") ?? ""
  const body = await request.text()

  const expected = createHmac("sha512", secretKey).update(body).digest("hex")
  if (sig !== expected) {
    console.warn("[webhook] Invalid signature — possible spoofed request")
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 })
  }

  let event: {
    event?: string
    data?: { status?: string; amount?: number; reference?: string; metadata?: { booking?: BookingMeta } }
  }
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  if (event.event === "charge.success" && event.data?.status === "success") {
    const paystackReference = event.data?.reference ?? ""
    const amountPaid = (event.data?.amount ?? 0) / 100
    const meta = event.data?.metadata?.booking ?? {}
    const internalReference = meta.internalReference || ""
    console.log(`[webhook] charge.success paystackRef=${paystackReference} internalRef=${internalReference} amount=R${amountPaid}`)

    if (!internalReference) {
      console.error(`[webhook] paystackRef=${paystackReference} has no internalReference in metadata — cannot drive the state machine, skipping (old/manual transaction?)`)
      return NextResponse.json({ ok: true })
    }

    const claimed = await transitionBookingStatus(internalReference, "PAYMENT_CONFIRMED", {
      from: ["AWAITING_PAYMENT"],
      reason: `Paystack charge.success ref=${paystackReference}`,
    })
    if (claimed.ok) {
      const ctx: PaymentContext = {
        reference: internalReference,
        bookingRef: meta.bookingRef ?? "",
        guestEmail: meta.guestEmail ?? "",
        guestName: meta.guestName ?? "",
        guestPhone: meta.guestPhone ?? "",
        checkin: meta.checkin ?? "",
        checkout: meta.checkout ?? "",
        roomTypeName: meta.roomTypeName ?? "",
        roomName: meta.roomName || undefined,
        amountPaid,
      }
      await sendPaymentConfirmedEmails(ctx)
      await transitionBookingStatus(internalReference, "BOGA_NOTIFIED", { from: ["PAYMENT_CONFIRMED"] })
      console.log(`[webhook] internalRef=${internalReference} guest-confirmation + admin notification emails sent`)
    } else {
      console.log(`[webhook] internalRef=${internalReference} PAYMENT_CONFIRMED transition rejected (${claimed.reason}) — already processed by webhook retry or /api/payment/verify, skipping`)
    }
  }

  return NextResponse.json({ ok: true })
}
