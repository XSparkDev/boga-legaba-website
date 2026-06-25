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
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Payment Confirmed – Boga Legaba</title>
</head>
<body style="margin:0;padding:0;background:#F2EDE4;font-family:'DM Sans',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EDE4;padding:48px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.09);">

  <!-- Dark lodge header -->
  <tr><td style="background:#0A0A0A;padding:36px 40px;text-align:center;">
    <p style="color:#C9A84C;margin:0;font-size:18px;letter-spacing:4px;font-weight:400;font-family:Georgia,'Times New Roman',serif;">BOGA LEGABA</p>
    <p style="color:#8C7B6B;margin:6px 0 0;font-size:10px;letter-spacing:2.5px;">PRIVATE GAME LODGE</p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding-top:18px;">
      <table align="center" cellpadding="0" cellspacing="0"><tr><td style="background:#C9A84C;height:1px;width:48px;opacity:0.6;font-size:0;">&nbsp;</td></tr></table>
    </td></tr></table>
  </td></tr>

  <!-- Gold confirmation strip -->
  <tr><td style="background:#C9A84C;padding:0;height:4px;font-size:0;">&nbsp;</td></tr>

  <!-- Success badge + heading -->
  <tr><td style="padding:40px 40px 24px;text-align:center;">
    <table align="center" cellpadding="0" cellspacing="0">
      <tr><td style="width:52px;height:52px;border-radius:50%;border:2px solid #C9A84C;background:#F2EDE4;text-align:center;vertical-align:middle;">
        <span style="color:#C9A84C;font-size:22px;line-height:52px;">&#10003;</span>
      </td></tr>
    </table>
    <p style="margin:20px 0 6px;color:#0A0A0A;font-size:24px;font-weight:400;font-family:Georgia,'Times New Roman',serif;letter-spacing:-0.01em;">Payment Confirmed</p>
    <p style="margin:0;color:#8C7B6B;font-size:13px;line-height:1.7;">
      Dear <strong style="color:#3D3532;">${guestName || "Guest"}</strong>,<br>
      We have received your payment. Your stay at Boga Legaba is fully confirmed.
    </p>
  </td></tr>

  <!-- Booking details -->
  <tr><td style="padding:0 32px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;border:1px solid #E8E0D4;">

      <tr><td style="background:#FAFAF8;padding:14px 20px;border-bottom:1px solid #E8E0D4;">
        <p style="margin:0;color:#8C7B6B;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Booking Reference</p>
        <p style="margin:4px 0 0;color:#3D3532;font-size:16px;font-weight:600;">${bookingRef || "—"}</p>
      </td></tr>

      <tr><td style="background:#F2EDE4;padding:14px 20px;border-bottom:1px solid #E8E0D4;">
        <p style="margin:0;color:#8C7B6B;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Room</p>
        <p style="margin:4px 0 0;color:#3D3532;font-size:14px;font-weight:500;">${roomTypeName || "—"}</p>
      </td></tr>

      <tr><td style="background:#FAFAF8;padding:14px 20px;border-bottom:1px solid #E8E0D4;">
        <p style="margin:0;color:#8C7B6B;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Check-in</p>
        <p style="margin:4px 0 0;color:#3D3532;font-size:14px;font-weight:500;">${checkin}</p>
      </td></tr>

      <tr><td style="background:#F2EDE4;padding:14px 20px;border-bottom:1px solid #E8E0D4;">
        <p style="margin:0;color:#8C7B6B;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Check-out</p>
        <p style="margin:4px 0 0;color:#3D3532;font-size:14px;font-weight:500;">${checkout}</p>
      </td></tr>

      <tr><td style="background:#FAFAF8;padding:14px 20px;">
        <p style="margin:0;color:#8C7B6B;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Amount Paid</p>
        <p style="margin:4px 0 0;color:#B8973B;font-size:22px;font-weight:700;font-family:Georgia,'Times New Roman',serif;">${amount}</p>
      </td></tr>

    </table>
  </td></tr>

  <!-- Message -->
  <tr><td style="padding:0 32px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EDE4;border-radius:10px;border:1px solid #E8E0D4;">
      <tr><td style="padding:16px 20px;text-align:center;">
        <p style="margin:0;color:#8C7B6B;font-size:12px;line-height:1.8;">
          If you have any questions, please reply to this email or reach out via WhatsApp.<br>
          We look forward to welcoming you to the bush.
        </p>
      </td></tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#0A0A0A;padding:24px 32px;text-align:center;">
    <p style="color:#C9A84C;margin:0;font-size:11px;letter-spacing:2px;font-family:Georgia,'Times New Roman',serif;">BOGA LEGABA</p>
    <p style="color:#8C7B6B;margin:6px 0 0;font-size:10px;letter-spacing:0.5px;">Mahikeng, North West · South Africa</p>
    <p style="color:#3D3532;margin:12px 0 0;font-size:10px;">Payment processed securely via Paystack · Please keep this email for your records.</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}
