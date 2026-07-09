import { NextRequest, NextResponse } from "next/server"
import { initiatePaystackPayment } from "@/lib/payment-utils"

export const dynamic = "force-dynamic"

/**
 * BOOK-FIRST FLOW, step 2: the room is already really booked on NightsBridge
 * by this point (see /api/booking/start + /api/booking/status) — this just
 * starts a Paystack payment for it. No availability/hold checks needed here
 * anymore, since the booking itself is already the authoritative reservation.
 *
 * NOTE: the primary path now pre-generates this session server-side inside
 * /api/booking/status (so the SAME link can be embedded in the "booking
 * reserved" email and used for the immediate browser redirect — one Paystack
 * session per booking, never two). This route is kept as the widget's
 * fallback for the rare case that pre-generation failed.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 })
  }

  const result = await initiatePaystackPayment(body as never)
  return NextResponse.json(result, { status: result.ok ? 200 : (result.error === "Payment not configured" ? 503 : 400) })
}
