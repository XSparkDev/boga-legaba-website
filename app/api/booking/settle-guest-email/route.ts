import { NextRequest, NextResponse } from "next/server"
import { settleGuestConfirmation } from "@/lib/booking-emails"

export const dynamic = "force-dynamic"

/**
 * Worker-completion hook. The NightsBridge worker POSTs here (best-effort,
 * authenticated with CRON_SECRET) the moment a booking RESOLVES — completed or
 * failed — so the guest's held-back "Payment Confirmed" email is sent as soon
 * as their booking settles, even in the rarer case where they finished paying
 * BEFORE the background NightsBridge job did (so no payment-time trigger, and
 * no browser poll, would otherwise have caught the completion).
 *
 * settleGuestConfirmation is fully idempotent (atomic BOGA_NOTIFIED ->
 * GUEST_CONFIRMED claim), so it's harmless if payment isn't confirmed yet
 * (returns "not claimed" and the payment path sends it later) or if some other
 * trigger already sent it.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET ?? ""
  const auth = request.headers.get("authorization") ?? ""
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  let reference = ""
  try {
    const body = (await request.json()) as { reference?: string }
    reference = String(body.reference ?? "").trim()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 })
  }
  if (!reference) {
    return NextResponse.json({ ok: false, error: "reference is required" }, { status: 400 })
  }

  const result = await settleGuestConfirmation(reference)
  console.log(`[settle-guest-email] reference=${reference} sent=${result.sent} (${result.reason})`)
  return NextResponse.json({ ok: true, reference, ...result })
}
