/**
 * Paystack webhook handler — server-to-server event fired by Paystack regardless
 * of whether the guest's browser completes the redirect. This is the safety net
 * for "tab closed" or network failures after payment.
 *
 * Setup: in your Paystack dashboard → Settings → Webhooks, add:
 *   https://your-domain.com/api/payment/webhook
 *
 * Note: on the normal happy path both this webhook AND /api/payment/verify fire.
 * Duplicate emails are possible but rare — the bigger risk is a missed payment, so
 * we process both and accept the occasional duplicate as an acceptable trade-off.
 */
import { NextRequest, NextResponse } from "next/server"
import { createHmac } from "crypto"
import { processPayment } from "@/lib/payment-utils"

export const dynamic = "force-dynamic"

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

  // ── Parse event ───────────────────────────────────────────────────────────
  let event: {
    event?: string
    data?: {
      status?: string
      amount?: number
      reference?: string
      customer?: { email?: string }
      metadata?: {
        bookingRef?: string
        guestName?: string
        guestPhone?: string
        checkin?: string
        checkout?: string
        roomTypeName?: string
      }
    }
  }
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  // Only handle successful charges
  if (event.event !== "charge.success" || event.data?.status !== "success") {
    return NextResponse.json({ ok: true, message: "Event ignored" })
  }

  const data     = event.data
  const meta     = data?.metadata ?? {}
  const amountPaid  = (data?.amount ?? 0) / 100
  const bookingRef  = meta.bookingRef  ?? ""
  const guestName   = meta.guestName   ?? ""
  const guestPhone  = meta.guestPhone  ?? ""
  const guestEmail  = data?.customer?.email ?? ""
  const checkin     = meta.checkin     ?? ""
  const checkout    = meta.checkout    ?? ""
  const roomTypeName = meta.roomTypeName ?? ""
  const reference   = data?.reference  ?? ""

  console.log(`[webhook] charge.success: ref=${reference} bookingRef=${bookingRef} amount=R${amountPaid}`)

  await processPayment({
    reference,
    bookingRef,
    guestEmail,
    guestName,
    guestPhone,
    checkin,
    checkout,
    roomTypeName,
    amountPaid,
  })

  return NextResponse.json({ ok: true })
}
