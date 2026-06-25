import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const reference   = searchParams.get("reference")
  const bookingRef  = searchParams.get("bookingRef") ?? ""
  const guestEmail  = searchParams.get("guestEmail") ?? ""
  const guestName   = searchParams.get("guestName") ?? ""
  const checkin     = searchParams.get("checkin") ?? ""
  const checkout    = searchParams.get("checkout") ?? ""
  const roomTypeName = searchParams.get("roomTypeName") ?? ""

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${request.headers.get("host")}`
  const failedUrl = new URL(`/payment/failed?bookingRef=${encodeURIComponent(bookingRef)}`, siteUrl)
  const successUrl = new URL(
    `/payment/success?bookingRef=${encodeURIComponent(bookingRef)}&guestName=${encodeURIComponent(guestName)}&checkin=${encodeURIComponent(checkin)}&checkout=${encodeURIComponent(checkout)}&roomTypeName=${encodeURIComponent(roomTypeName)}`,
    siteUrl,
  )

  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey || !reference) {
    return NextResponse.redirect(failedUrl)
  }

  // ── Verify with Paystack ──────────────────────────────────────────────────
  let amountPaid = 0
  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    })
    const data = (await res.json()) as {
      status: boolean
      data?: { status: string; amount: number; customer: { email: string } }
    }
    if (!data.status || data.data?.status !== "success") {
      return NextResponse.redirect(failedUrl)
    }
    amountPaid = (data.data?.amount ?? 0) / 100
  } catch {
    return NextResponse.redirect(failedUrl)
  }

  // ── Send confirmation email via Resend ────────────────────────────────────
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey && resendKey !== "re_REPLACE_ME" && guestEmail) {
    try {
      const resend = new Resend(resendKey)
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "Boga Legaba <onboarding@resend.dev>",
        to: guestEmail,
        subject: "Payment Confirmed – Boga Legaba",
        html: buildPaymentEmail({ guestName, bookingRef, checkin, checkout, roomTypeName, amountPaid }),
      })
    } catch (err) {
      console.error("[payment/verify] Resend error:", err)
    }
  }

  // ── Update NightsBridge booking status to "Confirm" ───────────────────────
  if (bookingRef) {
    try {
      const workerUrl = (process.env.SYNC_WORKER_URL ?? "").replace(/\/run$/, "")
      const cronSecret = process.env.CRON_SECRET
      if (workerUrl && cronSecret) {
        await fetch(`${workerUrl}/manage-booking`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cronSecret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ bookingRef, action: "confirm" }),
          signal: AbortSignal.timeout(120_000),
        })
      }
    } catch (err) {
      console.error("[payment/verify] NightsBridge confirm error:", err)
    }
  }

  successUrl.searchParams.set("amount", String(amountPaid))
  return NextResponse.redirect(successUrl)
}

// ── Email template ────────────────────────────────────────────────────────────

function buildPaymentEmail({
  guestName,
  bookingRef,
  checkin,
  checkout,
  roomTypeName,
  amountPaid,
}: {
  guestName: string
  bookingRef: string
  checkin: string
  checkout: string
  roomTypeName: string
  amountPaid: number
}) {
  const amount = `R ${amountPaid.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Payment Confirmed</title></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.09);">

  <!-- Header -->
  <tr><td style="background:#1a3a2a;padding:32px;text-align:center;">
    <h1 style="color:#d4a843;margin:0;font-size:26px;letter-spacing:3px;font-weight:normal;">BOGA LEGABA</h1>
    <p style="color:#a8c5b4;margin:6px 0 0;font-size:12px;letter-spacing:1px;">PRIVATE GAME LODGE</p>
  </td></tr>

  <!-- Green confirmed banner -->
  <tr><td style="background:#22c55e;padding:18px;text-align:center;">
    <p style="color:#fff;margin:0;font-size:17px;font-weight:bold;">✓ &nbsp;Payment Confirmed</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px;">
    <p style="color:#374151;font-size:16px;margin:0 0 8px;">Dear ${guestName || "Guest"},</p>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 24px;">
      Thank you! We have received your payment and your stay at Boga Legaba is fully confirmed.
      We look forward to welcoming you.
    </p>

    <!-- Details box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f2;border-radius:8px;border:1px solid #e5e7eb;">
      <tr><td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
        <p style="margin:0;color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Booking Reference</p>
        <p style="margin:4px 0 0;color:#111827;font-size:18px;font-weight:bold;">${bookingRef || "—"}</p>
      </td></tr>
      <tr><td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
        <p style="margin:0;color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Room</p>
        <p style="margin:4px 0 0;color:#111827;font-size:14px;">${roomTypeName || "—"}</p>
      </td></tr>
      <tr><td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
        <p style="margin:0;color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Check-in</p>
        <p style="margin:4px 0 0;color:#111827;font-size:14px;">${checkin}</p>
      </td></tr>
      <tr><td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
        <p style="margin:0;color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Check-out</p>
        <p style="margin:4px 0 0;color:#111827;font-size:14px;">${checkout}</p>
      </td></tr>
      <tr><td style="padding:16px 20px;">
        <p style="margin:0;color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Amount Paid</p>
        <p style="margin:4px 0 0;color:#22c55e;font-size:22px;font-weight:bold;">${amount}</p>
      </td></tr>
    </table>

    <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:24px 0 0;">
      If you have any questions, feel free to reply to this email or reach out via WhatsApp.
      We'll see you soon!
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f9f7f2;border-top:1px solid #e5e7eb;padding:20px;text-align:center;">
    <p style="color:#9ca3af;font-size:11px;margin:0;">Boga Legaba Private Game Lodge</p>
    <p style="color:#d1d5db;font-size:10px;margin:4px 0 0;">This is an automated payment confirmation. Please keep it for your records.</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}
