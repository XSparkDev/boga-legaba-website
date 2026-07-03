/**
 * Paystack webhook handler — server-to-server event fired by Paystack regardless
 * of whether the guest's browser completes the redirect.
 *
 * IMPORTANT (pay-first flow): the actual NightsBridge booking is created by the
 * redirect callback in /api/payment/verify once payment succeeds. This webhook
 * therefore only VERIFIES and LOGS — it does NOT create a booking. If it did,
 * the happy path (callback + webhook both fire) would create the SAME booking
 * twice.
 *
 * If you later want the webhook to also create the booking as a safety net for
 * "guest closed the tab before the redirect", it must share an idempotency key
 * (the Paystack `reference`) with the callback so a reference is only ever booked
 * once. Until that guard exists, keep booking creation in the callback only.
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
