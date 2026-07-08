import { NextRequest, NextResponse } from "next/server"
import { sendPaymentConfirmedEmails, type PaymentContext } from "@/lib/payment-utils"

export const dynamic = "force-dynamic"

type BookingMeta = {
  bookingRef?: string
  guestEmail?: string
  guestName?: string
  guestPhone?: string
  checkin?: string
  checkout?: string
  roomTypeName?: string
}

/**
 * BOOK-FIRST FLOW, step 3: Paystack redirects here after the guest pays. The
 * room was already booked on NightsBridge in step 1 (see /api/booking/start) —
 * this just verifies the payment and sends the final confirmation email. If
 * payment fails or is abandoned here, the booking is left as-is (the guest
 * already has NightsBridge's own reservation email) — nothing is auto-cancelled.
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
  }

  await sendPaymentConfirmedEmails(ctx)

  const successUrl = new URL(
    `/payment/success?bookingRef=${encodeURIComponent(ctx.bookingRef)}` +
      `&guestName=${encodeURIComponent(ctx.guestName)}` +
      `&checkin=${encodeURIComponent(ctx.checkin)}` +
      `&checkout=${encodeURIComponent(ctx.checkout)}` +
      `&roomTypeName=${encodeURIComponent(ctx.roomTypeName)}` +
      `&amount=${amountPaid}`,
    siteUrl,
  )
  return NextResponse.redirect(successUrl)
}
