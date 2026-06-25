import { NextRequest, NextResponse } from "next/server"
import { processPayment } from "@/lib/payment-utils"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const reference    = searchParams.get("reference")
  const bookingRef   = searchParams.get("bookingRef") ?? ""
  const guestEmail   = searchParams.get("guestEmail") ?? ""
  const guestName    = searchParams.get("guestName") ?? ""
  const guestPhone   = searchParams.get("guestPhone") ?? ""
  const checkin      = searchParams.get("checkin") ?? ""
  const checkout     = searchParams.get("checkout") ?? ""
  const roomTypeName = searchParams.get("roomTypeName") ?? ""

  const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL || `https://${request.headers.get("host")}`
  const failedUrl = new URL(`/payment/failed?bookingRef=${encodeURIComponent(bookingRef)}`, siteUrl)
  const successUrl = new URL(
    `/payment/success?bookingRef=${encodeURIComponent(bookingRef)}&guestName=${encodeURIComponent(guestName)}&checkin=${encodeURIComponent(checkin)}&checkout=${encodeURIComponent(checkout)}&roomTypeName=${encodeURIComponent(roomTypeName)}`,
    siteUrl,
  )

  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey || !reference) return NextResponse.redirect(failedUrl)

  // ── Verify with Paystack ──────────────────────────────────────────────────
  let amountPaid = 0
  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    })
    const data = (await res.json()) as {
      status: boolean
      data?: { status: string; amount: number }
    }
    if (!data.status || data.data?.status !== "success") return NextResponse.redirect(failedUrl)
    amountPaid = (data.data?.amount ?? 0) / 100
  } catch {
    return NextResponse.redirect(failedUrl)
  }

  // ── Process payment (emails + NightsBridge confirm) ───────────────────────
  await processPayment({
    reference:    reference ?? "",
    bookingRef,
    guestEmail,
    guestName,
    guestPhone,
    checkin,
    checkout,
    roomTypeName,
    amountPaid,
  })

  successUrl.searchParams.set("amount", String(amountPaid))
  return NextResponse.redirect(successUrl)
}
