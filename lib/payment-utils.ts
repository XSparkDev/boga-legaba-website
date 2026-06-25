/**
 * Shared utilities for payment processing — used by both the verify callback
 * route and the Paystack webhook handler so logic is never duplicated.
 */
import { Resend } from "resend"

// ── Formatters ────────────────────────────────────────────────────────────────

export function fmtDate(iso: string) {
  if (!iso) return "—"
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })
}

export function fmtAmount(rands: number) {
  return `R ${rands.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`
}

// ── Core payment processor ────────────────────────────────────────────────────

export interface PaymentContext {
  reference:    string
  bookingRef:   string
  guestEmail:   string
  guestName:    string
  guestPhone:   string
  checkin:      string
  checkout:     string
  roomTypeName: string
  amountPaid:   number
}

/**
 * Called after Paystack confirms a successful payment (from both the redirect
 * callback and the server-side webhook). Sends emails and confirms NightsBridge.
 * Returns whether the NightsBridge confirm succeeded.
 */
export async function processPayment(ctx: PaymentContext): Promise<{ nbConfirmed: boolean }> {
  const resendKey  = process.env.RESEND_API_KEY
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL ?? "bogalegaba@gmail.com"
  const from       = process.env.RESEND_FROM_EMAIL ?? "Boga Legaba <onboarding@resend.dev>"
  const useResend  = Boolean(resendKey && resendKey !== "re_REPLACE_ME")

  // ── Step 1: Confirmation emails ──────────────────────────────────────────
  if (useResend) {
    const resend = new Resend(resendKey!)
    if (ctx.guestEmail) {
      try {
        await resend.emails.send({
          from,
          to:      ctx.guestEmail,
          subject: "Payment Confirmed – Boga Legaba",
          html:    buildGuestConfirmEmail(ctx),
        })
      } catch (err) {
        console.error("[payment] Guest confirmation email error:", err)
      }
    }
    try {
      await resend.emails.send({
        from,
        to:      adminEmail,
        subject: `New Payment – ${ctx.guestName} · ${ctx.bookingRef || "no ref"}`,
        html:    buildAdminPaymentEmail(ctx),
      })
    } catch (err) {
      console.error("[payment] Admin notification email error:", err)
    }
  }

  // ── Step 2: Confirm NightsBridge (always runs, even without Resend) ──────
  let nbConfirmed = false
  if (ctx.bookingRef) {
    const workerUrl  = (process.env.SYNC_WORKER_URL ?? "").replace(/\/run$/, "")
    const cronSecret = process.env.CRON_SECRET
    if (workerUrl && cronSecret) {
      try {
        const res = await fetch(`${workerUrl}/manage-booking`, {
          method:  "POST",
          headers: {
            Authorization:  `Bearer ${cronSecret}`,
            "Content-Type": "application/json",
          },
          body:   JSON.stringify({ bookingRef: ctx.bookingRef, action: "confirm" }),
          signal: AbortSignal.timeout(120_000),
        })
        const result = (await res.json().catch(() => ({}))) as { ok?: boolean }
        nbConfirmed = result.ok === true
      } catch (err) {
        console.error("[payment] NightsBridge confirm error:", err)
      }
    }
  }

  // ── Step 3: Alert admin if NB confirm failed ─────────────────────────────
  if (!nbConfirmed && ctx.bookingRef && useResend) {
    try {
      const resend = new Resend(resendKey!)
      await resend.emails.send({
        from,
        to:      adminEmail,
        subject: `ACTION REQUIRED - NightsBridge confirm failed for ${ctx.bookingRef}`,
        html:    buildNBFailureEmail(ctx),
      })
    } catch { /* best effort alert */ }
  }

  return { nbConfirmed }
}

// ── Email: guest payment confirmation ─────────────────────────────────────────

export function buildGuestConfirmEmail(ctx: PaymentContext) {
  const amount      = fmtAmount(ctx.amountPaid)
  const checkinFmt  = fmtDate(ctx.checkin)
  const checkoutFmt = fmtDate(ctx.checkout)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Payment Confirmed – Boga Legaba</title>
</head>
<body style="margin:0;padding:0;background:#F2EDE4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EDE4;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 48px rgba(0,0,0,0.12);">

  <!-- HEADER -->
  <tr><td style="background:#0A0A0A;padding:32px 40px;text-align:center;">
    <p style="color:#C9A84C;margin:0;font-size:20px;letter-spacing:5px;font-weight:400;font-family:Georgia,serif;">BOGA LEGABA</p>
    <p style="color:#8C7B6B;margin:5px 0 0;font-size:9px;letter-spacing:3px;text-transform:uppercase;">Private Game Lodge &amp; Conference Centre</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;"><tr><td align="center"><table cellpadding="0" cellspacing="0"><tr><td style="background:#C9A84C;height:1px;width:40px;font-size:0;">&nbsp;</td></tr></table></td></tr></table>
  </td></tr>

  <!-- SUCCESS HERO -->
  <tr><td style="background:#0A0A0A;padding:0 40px 40px;text-align:center;">
    <table align="center" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr><td style="width:72px;height:72px;border-radius:50%;background:#C9A84C;text-align:center;vertical-align:middle;">
        <span style="color:#0A0A0A;font-size:36px;line-height:72px;font-weight:700;">&#10003;</span>
      </td></tr>
    </table>
    <p style="margin:0 0 8px;color:#C9A84C;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Payment Successful</p>
    <p style="margin:0;color:#ffffff;font-size:32px;font-weight:400;font-family:Georgia,serif;line-height:1.2;">Your stay is confirmed,<br><span style="color:#C9A84C;">${ctx.guestName ? ctx.guestName.split(" ")[0] : "Guest"}</span></p>
  </td></tr>

  <!-- GOLD BAR -->
  <tr><td style="background:#C9A84C;height:5px;font-size:0;">&nbsp;</td></tr>

  <!-- REFERENCE HERO BLOCK -->
  <tr><td style="background:#F2EDE4;padding:32px 40px;text-align:center;">
    <p style="margin:0 0 10px;color:#8C7B6B;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;">Booking Reference</p>
    <p style="margin:0;color:#0A0A0A;font-size:38px;font-weight:700;letter-spacing:4px;font-family:Georgia,serif;">${ctx.bookingRef || "—"}</p>
    <p style="margin:10px 0 0;color:#8C7B6B;font-size:11px;line-height:1.6;">Quote this number if you contact us about your stay</p>
  </td></tr>

  <!-- AMOUNT PAID BLOCK -->
  <tr><td style="background:#0A0A0A;padding:28px 40px;text-align:center;">
    <p style="margin:0 0 8px;color:#8C7B6B;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;">Amount Paid</p>
    <p style="margin:0;color:#C9A84C;font-size:44px;font-weight:700;font-family:Georgia,serif;letter-spacing:1px;">${amount}</p>
    <p style="margin:10px 0 0;color:#8C7B6B;font-size:11px;">Paid securely via Paystack &middot; VAT included</p>
  </td></tr>

  <!-- STAY DETAILS -->
  <tr><td style="padding:32px 40px 24px;">
    <p style="margin:0 0 16px;color:#8C7B6B;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Your Stay</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #E8E0D4;">
      <tr>
        <td width="50%" style="background:#FAFAF8;padding:16px 20px;border-right:1px solid #E8E0D4;border-bottom:1px solid #E8E0D4;">
          <p style="margin:0;color:#8C7B6B;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;">Room</p>
          <p style="margin:5px 0 0;color:#0A0A0A;font-size:14px;font-weight:600;">${ctx.roomTypeName || "—"}</p>
        </td>
        <td width="50%" style="background:#F2EDE4;padding:16px 20px;border-bottom:1px solid #E8E0D4;">
          <p style="margin:0;color:#8C7B6B;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;">Guest</p>
          <p style="margin:5px 0 0;color:#0A0A0A;font-size:14px;font-weight:600;">${ctx.guestName || "—"}</p>
        </td>
      </tr>
      <tr>
        <td width="50%" style="background:#F2EDE4;padding:16px 20px;border-right:1px solid #E8E0D4;border-bottom:1px solid #E8E0D4;">
          <p style="margin:0;color:#8C7B6B;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;">Check-in</p>
          <p style="margin:5px 0 0;color:#0A0A0A;font-size:15px;font-weight:700;">${checkinFmt}</p>
          <p style="margin:3px 0 0;color:#8C7B6B;font-size:11px;">From 14:00</p>
        </td>
        <td width="50%" style="background:#FAFAF8;padding:16px 20px;border-bottom:1px solid #E8E0D4;">
          <p style="margin:0;color:#8C7B6B;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;">Check-out</p>
          <p style="margin:5px 0 0;color:#0A0A0A;font-size:15px;font-weight:700;">${checkoutFmt}</p>
          <p style="margin:3px 0 0;color:#8C7B6B;font-size:11px;">By 10:00</p>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="background:#0A0A0A;padding:14px 20px;text-align:center;">
          <p style="margin:0;color:#8C7B6B;font-size:10px;letter-spacing:1px;">Paystack Reference &nbsp;&middot;&nbsp; <span style="color:#C9A84C;">${ctx.reference || ctx.bookingRef || "—"}</span></p>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- HOW TO GET THERE -->
  <tr><td style="padding:0 40px 24px;">
    <p style="margin:0 0 16px;color:#8C7B6B;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Getting There</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #E8E0D4;">
      <tr><td style="background:#FAFAF8;padding:18px 20px;border-bottom:1px solid #E8E0D4;">
        <p style="margin:0 0 4px;color:#8C7B6B;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;">Address</p>
        <p style="margin:0;color:#0A0A0A;font-size:14px;font-weight:600;">Riviera Park, Mahikeng</p>
        <p style="margin:2px 0 0;color:#8C7B6B;font-size:12px;">North West Province, 2745, South Africa</p>
        <p style="margin:2px 0 0;color:#8C7B6B;font-size:11px;">Approx. 5 min from Mmabatho CBD</p>
      </td></tr>
      <tr><td style="background:#F2EDE4;padding:18px 20px;border-bottom:1px solid #E8E0D4;">
        <p style="margin:0 0 4px;color:#8C7B6B;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;">GPS Coordinates</p>
        <p style="margin:0;color:#0A0A0A;font-size:13px;font-weight:600;letter-spacing:0.5px;">-25.8658, 25.6442</p>
      </td></tr>
      <tr><td style="background:#FAFAF8;padding:18px 20px;">
        <p style="margin:0 0 10px;color:#8C7B6B;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;">Directions</p>
        <a href="https://www.google.com/maps/dir/?api=1&destination=Riviera+Park+Mahikeng,+South+Africa" style="display:inline-block;background:#0A0A0A;color:#C9A84C;text-decoration:none;font-size:12px;font-weight:600;padding:10px 22px;border-radius:8px;letter-spacing:1px;">Open in Google Maps</a>
      </td></tr>
    </table>
  </td></tr>

  <!-- CONTACT US -->
  <tr><td style="padding:0 40px 24px;">
    <p style="margin:0 0 16px;color:#8C7B6B;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Contact Us</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #E8E0D4;">
      <tr>
        <td width="50%" style="background:#FAFAF8;padding:16px 20px;border-right:1px solid #E8E0D4;">
          <p style="margin:0 0 4px;color:#8C7B6B;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;">Phone</p>
          <a href="tel:+27828757018" style="color:#0A0A0A;text-decoration:none;font-size:14px;font-weight:600;">+27 82 875 7018</a>
        </td>
        <td width="50%" style="background:#F2EDE4;padding:16px 20px;">
          <p style="margin:0 0 4px;color:#8C7B6B;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;">Email</p>
          <a href="mailto:info@bogalegaba.co.za" style="color:#0A0A0A;text-decoration:none;font-size:13px;font-weight:600;">info@bogalegaba.co.za</a>
        </td>
      </tr>
      <tr><td colspan="2" style="background:#0A0A0A;padding:16px 20px;text-align:center;">
        <a href="https://wa.me/27828757018?text=Hi%20Boga%20Legaba%2C%20my%20booking%20reference%20is%20${encodeURIComponent(ctx.bookingRef || "")}" style="display:inline-block;background:#C9A84C;color:#0A0A0A;text-decoration:none;font-size:13px;font-weight:700;padding:12px 28px;border-radius:8px;letter-spacing:0.5px;">WhatsApp Us</a>
        <p style="margin:10px 0 0;color:#8C7B6B;font-size:10px;">Your booking reference will be pre-filled in the message</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- GOOD TO KNOW -->
  <tr><td style="padding:0 40px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;background:#F2EDE4;border:1px solid #E8E0D4;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 12px;color:#0A0A0A;font-size:12px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">Good to Know</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:5px 0;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="width:20px;color:#C9A84C;font-size:14px;font-weight:700;vertical-align:top;">&#8250;</td>
              <td style="color:#3D3532;font-size:12px;line-height:1.7;">Early check-in and late check-out available on request &mdash; contact us in advance</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:5px 0;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="width:20px;color:#C9A84C;font-size:14px;font-weight:700;vertical-align:top;">&#8250;</td>
              <td style="color:#3D3532;font-size:12px;line-height:1.7;">Breakfast is served from 07:00 &mdash; please notify us of any dietary requirements</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:5px 0;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="width:20px;color:#C9A84C;font-size:14px;font-weight:700;vertical-align:top;">&#8250;</td>
              <td style="color:#3D3532;font-size:12px;line-height:1.7;">Free secure parking is available on-site</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:5px 0;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="width:20px;color:#C9A84C;font-size:14px;font-weight:700;vertical-align:top;">&#8250;</td>
              <td style="color:#3D3532;font-size:12px;line-height:1.7;">Need to cancel or modify? Contact us via WhatsApp at least 48 hours before arrival</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:5px 0;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="width:20px;color:#C9A84C;font-size:14px;font-weight:700;vertical-align:top;">&#8250;</td>
              <td style="color:#3D3532;font-size:12px;line-height:1.7;">The property is non-smoking &mdash; designated outdoor areas available</td>
            </tr></table>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#0A0A0A;padding:28px 40px;text-align:center;">
    <p style="color:#C9A84C;margin:0;font-size:13px;letter-spacing:4px;font-family:Georgia,serif;">BOGA LEGABA</p>
    <p style="color:#8C7B6B;margin:6px 0 0;font-size:10px;letter-spacing:1px;">Riviera Park, Mahikeng, North West &middot; South Africa</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;"><tr><td align="center"><table cellpadding="0" cellspacing="0"><tr><td style="background:#C9A84C;height:1px;width:40px;font-size:0;">&nbsp;</td></tr></table></td></tr></table>
    <p style="color:#3D3532;margin:0;font-size:10px;line-height:1.7;">Payment processed securely via Paystack &middot; Please keep this email as proof of payment<br>
    <a href="https://www.bogalegaba.co.za" style="color:#C9A84C;text-decoration:none;">www.bogalegaba.co.za</a></p>
  </td></tr>

</table></td></tr></table>
</body></html>`
}

// ── Email: guest booking pending (before payment) ─────────────────────────────

export function buildGuestPendingEmail({
  guestName,
  bookingRef,
  checkin,
  checkout,
  roomTypeName,
  estimatedTotal,
}: {
  guestName:      string
  bookingRef:     string
  checkin:        string
  checkout:       string
  roomTypeName:   string
  estimatedTotal: string
}) {
  const checkinFmt  = fmtDate(checkin)
  const checkoutFmt = fmtDate(checkout)

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Booking Reserved – Boga Legaba</title></head>
<body style="margin:0;padding:0;background:#F2EDE4;font-family:'DM Sans',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EDE4;padding:48px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,.09);">

  <tr><td style="background:#0A0A0A;padding:36px 40px;text-align:center;">
    <p style="color:#C9A84C;margin:0;font-size:18px;letter-spacing:4px;font-weight:400;font-family:Georgia,serif;">BOGA LEGABA</p>
    <p style="color:#8C7B6B;margin:6px 0 0;font-size:10px;letter-spacing:2.5px;">PRIVATE GAME LODGE</p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding-top:18px;">
      <table align="center" cellpadding="0" cellspacing="0"><tr><td style="background:#C9A84C;height:1px;width:48px;font-size:0;">&nbsp;</td></tr></table>
    </td></tr></table>
  </td></tr>

  <tr><td style="background:#C9A84C;height:4px;font-size:0;">&nbsp;</td></tr>

  <tr><td style="padding:40px 40px 24px;text-align:center;">
    <p style="margin:20px 0 6px;color:#0A0A0A;font-size:24px;font-weight:400;font-family:Georgia,serif;">Booking Reserved</p>
    <p style="margin:0;color:#8C7B6B;font-size:13px;line-height:1.7;">Dear <strong style="color:#3D3532;">${guestName || "Guest"}</strong>,<br>Your room has been reserved. You were redirected to complete payment — if payment didn't go through, please contact us via WhatsApp and quote your booking reference.</p>
  </td></tr>

  <tr><td style="padding:0 32px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;border:1px solid #E8E0D4;">
      ${bookingRef ? `<tr><td style="background:#FAFAF8;padding:14px 20px;border-bottom:1px solid #E8E0D4;">
        <p style="margin:0;color:#8C7B6B;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Booking Reference</p>
        <p style="margin:4px 0 0;color:#3D3532;font-size:16px;font-weight:600;">${bookingRef}</p>
      </td></tr>` : ""}
      <tr><td style="background:#F2EDE4;padding:14px 20px;border-bottom:1px solid #E8E0D4;">
        <p style="margin:0;color:#8C7B6B;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Room</p>
        <p style="margin:4px 0 0;color:#3D3532;font-size:14px;font-weight:500;">${roomTypeName || "—"}</p>
      </td></tr>
      <tr><td style="background:#FAFAF8;padding:14px 20px;border-bottom:1px solid #E8E0D4;">
        <p style="margin:0;color:#8C7B6B;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Check-in</p>
        <p style="margin:4px 0 0;color:#3D3532;font-size:14px;font-weight:500;">${checkinFmt}</p>
      </td></tr>
      <tr><td style="background:#F2EDE4;padding:14px 20px;border-bottom:1px solid #E8E0D4;">
        <p style="margin:0;color:#8C7B6B;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Check-out</p>
        <p style="margin:4px 0 0;color:#3D3532;font-size:14px;font-weight:500;">${checkoutFmt}</p>
      </td></tr>
      ${estimatedTotal ? `<tr><td style="background:#FAFAF8;padding:14px 20px;">
        <p style="margin:0;color:#8C7B6B;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Amount Due</p>
        <p style="margin:4px 0 0;color:#B8973B;font-size:20px;font-weight:700;font-family:Georgia,serif;">${estimatedTotal}</p>
      </td></tr>` : ""}
    </table>
  </td></tr>

  <tr><td style="padding:0 32px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FEF9EE;border-radius:10px;border:1px solid #EDD9A3;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 4px;color:#92661A;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">&#9888; Awaiting Payment</p>
        <p style="margin:0;color:#8C7B6B;font-size:12px;line-height:1.8;">Your booking is held for 24 hours. If payment did not complete, please contact us via WhatsApp and we will assist you.</p>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="background:#0A0A0A;padding:24px 32px;text-align:center;">
    <p style="color:#C9A84C;margin:0;font-size:11px;letter-spacing:2px;font-family:Georgia,serif;">BOGA LEGABA</p>
    <p style="color:#8C7B6B;margin:6px 0 0;font-size:10px;">Mahikeng, North West · South Africa</p>
    <p style="color:#3D3532;margin:10px 0 0;font-size:10px;">This is an automated notification. Please keep it for your records.</p>
  </td></tr>

</table></td></tr></table>
</body></html>`
}

// ── Email: admin payment notification ─────────────────────────────────────────

export function buildAdminPaymentEmail(ctx: PaymentContext) {
  const amount      = fmtAmount(ctx.amountPaid)
  const checkinFmt  = fmtDate(ctx.checkin)
  const checkoutFmt = fmtDate(ctx.checkout)
  const now         = new Date().toLocaleString("en-ZA", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Johannesburg" })

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>New Payment Received</title></head>
<body style="margin:0;padding:0;background:#F2EDE4;font-family:'DM Sans',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EDE4;padding:48px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,.09);">

  <tr><td style="background:#0A0A0A;padding:28px 40px;text-align:center;">
    <p style="color:#C9A84C;margin:0;font-size:16px;letter-spacing:4px;font-weight:400;font-family:Georgia,serif;">BOGA LEGABA</p>
    <p style="color:#8C7B6B;margin:4px 0 0;font-size:10px;letter-spacing:2px;">ADMIN NOTIFICATION</p>
  </td></tr>
  <tr><td style="background:#C9A84C;height:4px;font-size:0;">&nbsp;</td></tr>

  <tr><td style="padding:32px 40px 20px;">
    <p style="margin:0 0 4px;color:#8C7B6B;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">New Payment Received</p>
    <p style="margin:0;color:#0A0A0A;font-size:22px;font-weight:400;font-family:Georgia,serif;">${ctx.guestName || "Guest"}</p>
    <p style="margin:4px 0 0;color:#8C7B6B;font-size:12px;">${now}</p>
  </td></tr>

  <tr><td style="padding:0 32px 20px;">
    <p style="margin:0 0 10px;color:#8C7B6B;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">Guest Information</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;border:1px solid #E8E0D4;">
      <tr><td style="background:#FAFAF8;padding:12px 20px;border-bottom:1px solid #E8E0D4;">
        <p style="margin:0;color:#8C7B6B;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Full Name</p>
        <p style="margin:3px 0 0;color:#3D3532;font-size:14px;font-weight:600;">${ctx.guestName || "—"}</p>
      </td></tr>
      <tr><td style="background:#F2EDE4;padding:12px 20px;border-bottom:1px solid #E8E0D4;">
        <p style="margin:0;color:#8C7B6B;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Email</p>
        <p style="margin:3px 0 0;color:#3D3532;font-size:14px;">${ctx.guestEmail || "—"}</p>
      </td></tr>
      <tr><td style="background:#FAFAF8;padding:12px 20px;border-bottom:1px solid #E8E0D4;">
        <p style="margin:0;color:#8C7B6B;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Phone</p>
        <p style="margin:3px 0 0;color:#3D3532;font-size:14px;font-weight:500;">${ctx.guestPhone || "—"}</p>
      </td></tr>
      <tr><td style="background:#F2EDE4;padding:12px 20px;border-bottom:1px solid #E8E0D4;">
        <p style="margin:0;color:#8C7B6B;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Booking Reference</p>
        <p style="margin:3px 0 0;color:#3D3532;font-size:14px;font-weight:600;">${ctx.bookingRef || "—"}</p>
      </td></tr>
      <tr><td style="background:#FAFAF8;padding:12px 20px;border-bottom:1px solid #E8E0D4;">
        <p style="margin:0;color:#8C7B6B;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Room</p>
        <p style="margin:3px 0 0;color:#3D3532;font-size:14px;">${ctx.roomTypeName || "—"}</p>
      </td></tr>
      <tr><td style="background:#F2EDE4;padding:12px 20px;border-bottom:1px solid #E8E0D4;">
        <p style="margin:0;color:#8C7B6B;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Check-in</p>
        <p style="margin:3px 0 0;color:#3D3532;font-size:14px;">${checkinFmt}</p>
      </td></tr>
      <tr><td style="background:#FAFAF8;padding:12px 20px;border-bottom:1px solid #E8E0D4;">
        <p style="margin:0;color:#8C7B6B;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Check-out</p>
        <p style="margin:3px 0 0;color:#3D3532;font-size:14px;">${checkoutFmt}</p>
      </td></tr>
      <tr><td style="background:#F2EDE4;padding:12px 20px;">
        <p style="margin:0;color:#8C7B6B;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Amount Paid</p>
        <p style="margin:3px 0 0;color:#B8973B;font-size:22px;font-weight:700;font-family:Georgia,serif;">${amount}</p>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:0 32px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EDE4;border-radius:10px;border:1px solid #E8E0D4;">
      <tr><td style="padding:14px 20px;">
        <p style="margin:0;color:#8C7B6B;font-size:12px;line-height:1.7;">NightsBridge booking status has been automatically updated to <strong style="color:#3D3532;">Confirmed</strong>. Log into NightsBridge to view or manage this booking.</p>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="background:#0A0A0A;padding:20px 32px;text-align:center;">
    <p style="color:#C9A84C;margin:0;font-size:11px;letter-spacing:2px;font-family:Georgia,serif;">BOGA LEGABA</p>
    <p style="color:#3D3532;margin:8px 0 0;font-size:10px;">Automated admin notification · Do not reply to this email.</p>
  </td></tr>

</table></td></tr></table>
</body></html>`
}

// ── Email: NightsBridge confirm failure alert ──────────────────────────────────

export function buildNBFailureEmail(ctx: PaymentContext) {
  const amount = fmtAmount(ctx.amountPaid)
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Action Required – NightsBridge</title></head>
<body style="margin:0;padding:0;background:#F2EDE4;font-family:'DM Sans',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EDE4;padding:48px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,.09);">

  <tr><td style="background:#0A0A0A;padding:28px 40px;text-align:center;">
    <p style="color:#C9A84C;margin:0;font-size:16px;letter-spacing:4px;font-family:Georgia,serif;">BOGA LEGABA</p>
    <p style="color:#8C7B6B;margin:4px 0 0;font-size:10px;letter-spacing:2px;">ADMIN ALERT</p>
  </td></tr>
  <tr><td style="background:#EF4444;height:4px;font-size:0;">&nbsp;</td></tr>

  <tr><td style="padding:32px 40px 20px;">
    <p style="margin:0 0 8px;color:#EF4444;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">&#9888; Action Required</p>
    <p style="margin:0;color:#0A0A0A;font-size:20px;font-weight:400;font-family:Georgia,serif;">NightsBridge Not Confirmed</p>
    <p style="margin:8px 0 0;color:#8C7B6B;font-size:13px;line-height:1.7;">Payment was received successfully but the automatic NightsBridge status update failed. You must manually confirm this booking in NightsBridge.</p>
  </td></tr>

  <tr><td style="padding:0 32px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;border:1px solid #E8E0D4;">
      <tr><td style="background:#FAFAF8;padding:12px 20px;border-bottom:1px solid #E8E0D4;">
        <p style="margin:0;color:#8C7B6B;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Guest</p>
        <p style="margin:3px 0 0;color:#3D3532;font-size:14px;font-weight:600;">${ctx.guestName}</p>
      </td></tr>
      <tr><td style="background:#F2EDE4;padding:12px 20px;border-bottom:1px solid #E8E0D4;">
        <p style="margin:0;color:#8C7B6B;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Phone</p>
        <p style="margin:3px 0 0;color:#3D3532;font-size:14px;">${ctx.guestPhone || "—"}</p>
      </td></tr>
      <tr><td style="background:#FAFAF8;padding:12px 20px;border-bottom:1px solid #E8E0D4;">
        <p style="margin:0;color:#8C7B6B;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Booking Reference</p>
        <p style="margin:3px 0 0;color:#3D3532;font-size:14px;font-weight:600;">${ctx.bookingRef || "—"}</p>
      </td></tr>
      <tr><td style="background:#F2EDE4;padding:12px 20px;">
        <p style="margin:0;color:#8C7B6B;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Amount Paid</p>
        <p style="margin:3px 0 0;color:#B8973B;font-size:18px;font-weight:700;font-family:Georgia,serif;">${amount}</p>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="background:#0A0A0A;padding:20px 32px;text-align:center;">
    <p style="color:#C9A84C;margin:0;font-size:11px;letter-spacing:2px;font-family:Georgia,serif;">BOGA LEGABA · ADMIN ALERT</p>
  </td></tr>

</table></td></tr></table>
</body></html>`
}
