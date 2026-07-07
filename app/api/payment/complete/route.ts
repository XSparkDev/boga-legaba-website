import { NextRequest, NextResponse } from "next/server"
import { processPayment, type PaymentContext } from "@/lib/payment-utils"

export const dynamic = "force-dynamic"
// Creating the NightsBridge booking can take up to ~4 min when the worker is
// slow. Allow the handler to run that long on hosts that enforce a max
// duration (e.g. Vercel), otherwise a paid booking gets cut off server-side.
export const maxDuration = 300

type BookingMeta = {
  bookingRef?: string
  guestEmail?: string
  guestName?: string
  guestPhone?: string
  checkin?: string
  checkout?: string
  roomTypeName?: string
  mealPlanName?: string
  adults?: number
  children1?: number
  children2?: number
  firstname?: string
  surname?: string
  arrivalTime?: string
  airline?: string
  flightno?: string
  notes?: string
  bbid?: number
  maxAdults?: number | null
  maxOccupancy?: number | null
}

/**
 * Called by the /payment/processing loading page (via fetch) after Paystack
 * redirects the guest back. Verifies the payment with Paystack, then creates
 * the NightsBridge booking. Returns JSON so the page can show progress and then
 * route the guest to the success or failed screen.
 *
 * This is the POST/JSON sibling of the legacy GET /api/payment/verify redirect
 * route — same logic, but it hands control back to a client page that can show
 * a "securing your booking" spinner during the ~1-minute booking step.
 */
export async function POST(request: NextRequest) {
  let body: { reference?: string }
  try {
    body = (await request.json()) as { reference?: string }
  } catch {
    return NextResponse.json({ ok: false, stage: "verify", error: "Invalid request" }, { status: 400 })
  }

  const reference = body.reference ?? ""
  const secretKey = process.env.PAYSTACK_SECRET_KEY

  if (!secretKey) {
    return NextResponse.json({ ok: false, stage: "verify", error: "Payment not configured" }, { status: 503 })
  }
  if (!reference) {
    return NextResponse.json({ ok: false, stage: "verify", error: "Missing payment reference" }, { status: 400 })
  }

  // ── Verify the payment with Paystack (also returns our booking metadata) ──
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
    if (!data.status || data.data?.status !== "success") {
      return NextResponse.json(
        { ok: false, stage: "verify", error: "Payment could not be verified" },
        { status: 402 },
      )
    }
    amountPaid = (data.data?.amount ?? 0) / 100
    meta = data.data?.metadata?.booking ?? {}
  } catch {
    return NextResponse.json({ ok: false, stage: "verify", error: "Could not reach Paystack" }, { status: 502 })
  }

  // ── Payment is good → create the booking on NightsBridge ──────────────────
  const ctx: PaymentContext = {
    reference,
    bookingRef: meta.bookingRef ?? "",
    guestEmail: meta.guestEmail ?? "",
    guestName: meta.guestName ?? "",
    guestPhone: meta.guestPhone ?? "",
    checkin: meta.checkin ?? "",
    checkout: meta.checkout ?? "",
    roomTypeName: meta.roomTypeName ?? "",
    amountPaid,
    mealPlanName: meta.mealPlanName,
    adults: meta.adults,
    children1: meta.children1,
    children2: meta.children2,
    firstname: meta.firstname,
    surname: meta.surname,
    arrivalTime: meta.arrivalTime,
    airline: meta.airline,
    flightno: meta.flightno,
    notes: meta.notes,
    bbid: meta.bbid,
    maxAdults: meta.maxAdults ?? undefined,
    maxOccupancy: meta.maxOccupancy ?? undefined,
  }

  const { booked, bookingRef } = await processPayment(ctx)

  return NextResponse.json({
    ok: true,
    booked,
    bookingRef,
    guestName: ctx.guestName,
    checkin: ctx.checkin,
    checkout: ctx.checkout,
    roomTypeName: ctx.roomTypeName,
    amount: amountPaid,
  })
}
