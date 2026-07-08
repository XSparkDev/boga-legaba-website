/**
 * Paystack webhook handler — server-to-server event fired by Paystack regardless
 * of whether the guest's browser completes the redirect.
 *
 * BOOK-FIRST FLOW: the NightsBridge booking is created BEFORE payment is ever
 * requested (see /api/booking/start), so there's no booking-creation race to
 * guard against here — this webhook only VERIFIES and LOGS the payment event.
 */
import { NextRequest, NextResponse } from "next/server"
import { createHmac } from "crypto"

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

  let event: {
    event?: string
    data?: { status?: string; amount?: number; reference?: string }
  }
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  if (event.event === "charge.success" && event.data?.status === "success") {
    console.log(
      `[webhook] charge.success ref=${event.data?.reference} amount=R${(event.data?.amount ?? 0) / 100} ` +
        `— booking is handled by the /api/payment/verify callback (not created here to avoid duplicates)`,
    )
  }

  return NextResponse.json({ ok: true })
}
