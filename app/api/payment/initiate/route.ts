import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * BOOK-FIRST FLOW, step 2: the room is already really booked on NightsBridge
 * by this point (see /api/booking/start + /api/booking/status) — this just
 * starts a Paystack payment for it. No availability/hold checks needed here
 * anymore, since the booking itself is already the authoritative reservation.
 */
export async function POST(request: NextRequest) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey || secretKey === "sk_test_REPLACE_ME") {
    return NextResponse.json({ ok: false, error: "Payment not configured" }, { status: 503 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 })
  }

  const {
    email, amountRands, bookingRef, guestName, guestPhone, checkin, checkout, roomTypeName,
  } = body as {
    email: string
    amountRands: number
    bookingRef: string
    guestName?: string
    guestPhone?: string
    checkin?: string
    checkout?: string
    roomTypeName?: string
  }

  if (!email || !amountRands || !bookingRef) {
    return NextResponse.json({ ok: false, error: "Missing email, amountRands or bookingRef" }, { status: 400 })
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    `https://${request.headers.get("host")}`

  const reference = `BL-${bookingRef}-${Date.now()}`
  const callbackUrl = `${siteUrl}/api/payment/verify`

  try {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amountRands * 100), // kobo / cents
        reference,
        callback_url: callbackUrl,
        currency: "ZAR",
        metadata: {
          // Everything needed to send the final confirmation email — the
          // booking itself already exists, this is payment metadata only.
          booking: {
            bookingRef,
            guestEmail: email,
            guestName: guestName ?? "",
            guestPhone: guestPhone ?? "",
            checkin: checkin ?? "",
            checkout: checkout ?? "",
            roomTypeName: roomTypeName ?? "",
          },
          custom_fields: [
            { display_name: "Booking Ref",  variable_name: "booking_ref",  value: bookingRef },
            { display_name: "Room",         variable_name: "room_type",    value: roomTypeName ?? "" },
            { display_name: "Check-in",     variable_name: "checkin",      value: checkin ?? "" },
            { display_name: "Check-out",    variable_name: "checkout",     value: checkout ?? "" },
            { display_name: "Phone",        variable_name: "guest_phone",  value: guestPhone ?? "" },
          ],
        },
      }),
    })

    const data = (await res.json()) as { status: boolean; message: string; data?: { authorization_url: string; reference: string } }
    if (!data.status || !data.data) {
      return NextResponse.json({ ok: false, error: data.message || "Paystack init failed" }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Payment initiation failed"
    return NextResponse.json({ ok: false, error: msg }, { status: 502 })
  }
}
