import { NextRequest, NextResponse } from "next/server"
import { checkRoomTypeAvailableLive } from "@/lib/nightsbridge-api"

const NB_BBID = 21091

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
    // Full booking payload — carried through Paystack so the booking can be
    // created AFTER payment succeeds (pay-first flow).
    mealPlanName, adults, children1, children2, firstname, surname,
    arrivalTime, airline, flightno, notes, bbid, maxAdults, maxOccupancy,
  } = body as {
    email: string
    amountRands: number
    bookingRef: string
    guestName: string
    guestPhone: string
    checkin: string
    checkout: string
    roomTypeName: string
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
    maxAdults?: number
    maxOccupancy?: number
  }

  if (!email || !amountRands || !bookingRef) {
    return NextResponse.json({ ok: false, error: "Missing email, amountRands or bookingRef" }, { status: 400 })
  }

  // ── Availability gate BEFORE taking payment ────────────────────────────────
  // Don't charge a guest for a room that was just taken. "unknown" (NB
  // unreachable) does not block — the final booking after payment is the
  // authoritative gate and will refund-alert if it fails.
  const gateBbid = typeof bbid === "number" ? bbid : NB_BBID
  const live = await checkRoomTypeAvailableLive(gateBbid, roomTypeName, checkin, checkout)
  if (live.status === "unavailable") {
    return NextResponse.json(
      {
        ok: false,
        error: `Sorry — ${roomTypeName} was just taken for ${checkin} to ${checkout}. Please choose different dates or another room.`,
      },
      { status: 409 },
    )
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
          // Everything needed to CREATE the booking after payment.
          booking: {
            bookingRef,
            guestEmail: email,
            guestName,
            guestPhone: guestPhone ?? "",
            checkin,
            checkout,
            roomTypeName,
            mealPlanName: mealPlanName ?? "Room Only",
            adults: adults ?? 2,
            children1: children1 ?? 0,
            children2: children2 ?? 0,
            firstname: firstname ?? "",
            surname: surname ?? "",
            arrivalTime: arrivalTime ?? "",
            airline: airline ?? "",
            flightno: flightno ?? "",
            notes: notes ?? "",
            bbid: gateBbid,
            maxAdults: maxAdults ?? null,
            maxOccupancy: maxOccupancy ?? null,
          },
          custom_fields: [
            { display_name: "Booking Ref",  variable_name: "booking_ref",  value: bookingRef },
            { display_name: "Room",         variable_name: "room_type",    value: roomTypeName },
            { display_name: "Check-in",     variable_name: "checkin",      value: checkin },
            { display_name: "Check-out",    variable_name: "checkout",     value: checkout },
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
