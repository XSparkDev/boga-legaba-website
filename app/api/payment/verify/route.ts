import { NextRequest, NextResponse } from "next/server"
import { processPayment, type PaymentContext } from "@/lib/payment-utils"

export const dynamic = "force-dynamic"
// Booking can take up to ~4 min when the worker is slow — allow the handler to
// run that long on hosts that enforce a max duration (e.g. Vercel).
export const maxDuration = 300

/**
 * Legacy redirect-based verify+book route. The live callback_url is now
 * /payment/processing (a loading page that calls /api/payment/complete, the
 * JSON sibling of this route) so the guest sees progress instead of a blank
 * wait. This GET route is kept working as a fallback in case anything still
 * links here directly.
 */

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get("reference") ?? searchParams.get("trxref")

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${request.headers.get("host")}`
  const secretKey = process.env.PAYSTACK_SECRET_KEY

  const fail = (bookingRef = "", reason = "") =>
    NextResponse.redirect(
      new URL(
        `/payment/failed?bookingRef=${encodeURIComponent(bookingRef)}${reason ? `&reason=${encodeURIComponent(reason)}` : ""}`,
        siteUrl,
      ),
    )

  if (!secretKey || !reference) return fail()

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
    if (!data.status || data.data?.status !== "success") return fail()
    amountPaid = (data.data?.amount ?? 0) / 100
    meta = data.data?.metadata?.booking ?? {}
  } catch {
    return fail()
  }

  // ── Payment is good → NOW create the booking on NightsBridge ──────────────
  const ctx: PaymentContext = {
    reference,
    bookingRef:   meta.bookingRef ?? "",
    guestEmail:   meta.guestEmail ?? "",
    guestName:    meta.guestName ?? "",
    guestPhone:   meta.guestPhone ?? "",
    checkin:      meta.checkin ?? "",
    checkout:     meta.checkout ?? "",
    roomTypeName: meta.roomTypeName ?? "",
    amountPaid,
    mealPlanName: meta.mealPlanName,
    adults:       meta.adults,
    children1:    meta.children1,
    children2:    meta.children2,
    firstname:    meta.firstname,
    surname:      meta.surname,
    arrivalTime:  meta.arrivalTime,
    airline:      meta.airline,
    flightno:     meta.flightno,
    notes:        meta.notes,
    bbid:         meta.bbid,
    maxAdults:    meta.maxAdults ?? undefined,
    maxOccupancy: meta.maxOccupancy ?? undefined,
  }

  const { booked, bookingRef } = await processPayment(ctx)

  // Payment succeeded but the booking could not be created. Per business rule
  // the payment is kept (no auto-refund) — the guest is told to expect a
  // manual confirmation, and staff have already been alerted.
  if (!booked) {
    return fail(bookingRef, "paid-not-booked")
  }

  const successUrl = new URL(
    `/payment/success?bookingRef=${encodeURIComponent(bookingRef)}` +
      `&guestName=${encodeURIComponent(ctx.guestName)}` +
      `&checkin=${encodeURIComponent(ctx.checkin)}` +
      `&checkout=${encodeURIComponent(ctx.checkout)}` +
      `&roomTypeName=${encodeURIComponent(ctx.roomTypeName)}` +
      `&amount=${amountPaid}`,
    siteUrl,
  )
  return NextResponse.redirect(successUrl)
}
