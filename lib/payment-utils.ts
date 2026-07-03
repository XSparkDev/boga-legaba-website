/**
 * Shared utilities for payment processing — used by both the verify callback
 * route and the Paystack webhook handler so logic is never duplicated.
 */
import { Resend } from "resend"
import { releaseHold } from "@/lib/booking-holds"
import { emailShell, emailHero, emailInfoTable, emailButton, emailCallout, emailParagraph, EMAIL_COLORS, EMAIL_BRAND, type InfoRow } from "@/lib/email-theme"

/**
 * Attempt an automatic full refund of a Paystack transaction. Returns true only
 * if Paystack accepts the refund request. Best-effort — never throws.
 */
async function attemptPaystackRefund(reference: string): Promise<boolean> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey || !reference) return false
  try {
    const res = await fetch("https://api.paystack.co/refund", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transaction: reference }),
      signal: AbortSignal.timeout(20_000),
    })
    const data = (await res.json().catch(() => ({}))) as { status?: boolean }
    return data.status === true
  } catch (err) {
    console.error("[payment] Automatic refund error:", err)
    return false
  }
}

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

/**
 * Resolve first name / surname / full name from whatever the context has.
 * ctx.firstname/ctx.surname are the source of truth when present (the booking
 * widget always sends them); otherwise we fall back to splitting ctx.guestName.
 * Guarantees a name is always shown in admin/guest emails.
 */
function resolveGuestName(ctx: { guestName?: string; firstname?: string; surname?: string }) {
  const rawName = (ctx.guestName ?? "").trim()
  const [splitFirst, ...splitRest] = rawName ? rawName.split(/\s+/) : []
  const firstname = (ctx.firstname ?? splitFirst ?? "").trim()
  const surname = (ctx.surname ?? splitRest.join(" ") ?? "").trim()
  const full = rawName || `${firstname} ${surname}`.trim() || "Guest"
  return { firstname: firstname || "—", surname: surname || "—", full }
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
  // Full booking payload — needed to CREATE the booking AFTER payment succeeds
  // (pay-first flow: nothing is booked on NightsBridge until the guest has paid).
  mealPlanName?: string
  adults?:       number
  children1?:    number
  children2?:    number
  firstname?:    string
  surname?:      string
  arrivalTime?:  string
  airline?:      string
  flightno?:     string
  notes?:        string
  bbid?:         number
  maxAdults?:    number
  maxOccupancy?: number
}

/**
 * Called after Paystack confirms a successful payment (from both the redirect
 * callback and the server-side webhook).
 *
 * PAY-FIRST FLOW: the guest has already paid, and NOTHING is booked yet. So this
 * now CREATES the real NightsBridge booking (via the worker), and only on success
 * sends the confirmation emails. NightsBridge itself emails the guest once the
 * booking is registered. If the booking fails after a successful payment, we fire
 * an urgent "refund required" alert to the admin.
 *
 * Returns whether the booking was created, plus the real booking reference.
 */
export async function processPayment(
  ctx: PaymentContext,
): Promise<{ booked: boolean; bookingRef: string; confirmation?: Record<string, string>; refunded?: boolean }> {
  const resendKey  = process.env.RESEND_API_KEY
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL ?? "bogalegaba@gmail.com"
  const from       = process.env.RESEND_FROM_EMAIL ?? "Boga Legaba <onboarding@resend.dev>"
  const useResend  = Boolean(resendKey && resendKey !== "re_REPLACE_ME")

  // ── Step 1: CREATE the NightsBridge booking (payment already succeeded) ──
  let booked = false
  let bookingRef = ctx.bookingRef
  let confirmation: Record<string, string> | undefined
  const workerUrl  = (process.env.SYNC_WORKER_URL ?? "").replace(/\/run$/, "")
  const cronSecret = process.env.CRON_SECRET

  if (workerUrl && cronSecret) {
    const [firstname, ...rest] = (ctx.guestName || "").trim().split(/\s+/)
    try {
      const res = await fetch(`${workerUrl}/book`, {
        method:  "POST",
        headers: {
          Authorization:  `Bearer ${cronSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkin:       ctx.checkin,
          checkout:      ctx.checkout,
          roomTypeName:  ctx.roomTypeName,
          mealPlanName:  ctx.mealPlanName ?? "Room Only",
          adults:        ctx.adults ?? 2,
          children1:     ctx.children1 ?? 0,
          children2:     ctx.children2 ?? 0,
          firstname:     ctx.firstname ?? firstname ?? "",
          surname:       ctx.surname ?? rest.join(" ") ?? "",
          phone:         ctx.guestPhone,
          email:         ctx.guestEmail,
          arrivalTime:   ctx.arrivalTime ?? "",
          airline:       ctx.airline ?? "",
          flightno:      ctx.flightno ?? "",
          notes:         ctx.notes ?? "",
          paymentMethod: "bank_transfer",
          maxAdults:     ctx.maxAdults,
          maxOccupancy:  ctx.maxOccupancy,
        }),
        signal: AbortSignal.timeout(120_000),
      })
      const result = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        bookingRef?: string
        confirmation?: Record<string, string>
      }
      booked = result.ok === true
      if (result.bookingRef) bookingRef = result.bookingRef
      confirmation = result.confirmation
    } catch (err) {
      console.error("[payment] NightsBridge booking error:", err)
    }
  }

  const ctxRef: PaymentContext = { ...ctx, bookingRef }

  // Release the soft hold: its job is done once we've attempted the booking
  // (booked → room is now really booked; failed → we're about to refund).
  await releaseHold(ctx.reference)

  // ── Step 1b: Booking failed after payment → try to REFUND automatically ──
  // Only fall back to a manual "staff must refund by hand" alert if the
  // automatic refund itself fails.
  let refunded = false
  if (!booked) {
    refunded = await attemptPaystackRefund(ctx.reference)
  }

  // ── Step 2: Emails ───────────────────────────────────────────────────────
  if (useResend) {
    const resend = new Resend(resendKey!)

    // Guest branded confirmation — only when the booking actually went through.
    if (booked && ctx.guestEmail) {
      try {
        await resend.emails.send({
          from,
          to:      ctx.guestEmail,
          subject: "Payment Confirmed – Boga Legaba",
          html:    buildGuestConfirmEmail(ctxRef),
        })
      } catch (err) {
        console.error("[payment] Guest confirmation email error:", err)
      }
    }

    // Guest refund notice — booking failed but we auto-refunded them.
    if (!booked && refunded && ctx.guestEmail) {
      try {
        await resend.emails.send({
          from,
          to:      ctx.guestEmail,
          subject: "Refund processed – Boga Legaba",
          html:    buildGuestRefundEmail(ctxRef),
        })
      } catch (err) {
        console.error("[payment] Guest refund email error:", err)
      }
    }

    // Admin payment notification (always) — explicit first/surname, accurate status.
    const guestFullName = resolveGuestName(ctxRef).full
    try {
      await resend.emails.send({
        from,
        to:      adminEmail,
        subject: `New Payment – ${guestFullName} · ${bookingRef || "no ref"}`,
        html:    buildAdminPaymentEmail(ctxRef, booked),
      })
    } catch (err) {
      console.error("[payment] Admin notification email error:", err)
    }

    // Payment succeeded but booking FAILED.
    if (!booked) {
      if (refunded) {
        // Auto-refund worked — just inform admin (no manual action needed).
        try {
          await resend.emails.send({
            from,
            to:      adminEmail,
            subject: `Auto-refunded – booking failed after payment – ${guestFullName}`,
            html:    buildNBFailureEmail(ctxRef, true),
          })
        } catch { /* best effort */ }
      } else {
        // Auto-refund also failed → urgent manual refund required.
        try {
          await resend.emails.send({
            from,
            to:      adminEmail,
            subject: `ACTION REQUIRED – PAID, booking FAILED, AUTO-REFUND FAILED – ${guestFullName}`,
            html:    buildNBFailureEmail(ctxRef, false),
          })
        } catch { /* best effort */ }
      }
    }
  }

  return { booked, bookingRef, confirmation, refunded }
}

// ── Email: guest auto-refund notice ───────────────────────────────────────────

export function buildGuestRefundEmail(ctx: PaymentContext) {
  const amount = fmtAmount(ctx.amountPaid)
  const { firstname } = resolveGuestName(ctx)

  return emailShell({
    title: "Payment Refunded – Boga Legaba",
    preheader: `Your payment of ${amount} has been refunded.`,
    eyebrow: "Refund Processed",
    accentBarColor: EMAIL_COLORS.gold,
    bodyHtml:
      emailHero({
        eyebrow: "Refund Processed",
        heading: `We're sorry, ${firstname}`,
        subtext: "We were unable to confirm your room, so your payment has been refunded in full.",
      }) +
      emailInfoTable(
        [
          { label: "Room requested", value: ctx.roomTypeName || "—" },
          { label: "Check-in", value: fmtDate(ctx.checkin) },
          { label: "Check-out", value: fmtDate(ctx.checkout) },
          { label: "Amount refunded", value: amount, emphasis: true },
        ],
        { title: "Refund details" },
      ) +
      emailParagraph(
        `We hit a snag confirming this room automatically, so no booking was made and your payment of <strong style="color:${EMAIL_COLORS.bodyText};">${amount}</strong> has been refunded to your original payment method. Depending on your bank, this can take a few business days to reflect.`,
      ) +
      emailParagraph(
        "Please feel free to try booking again, or contact us directly and we'll gladly help you find a room.",
      ) +
      emailButton("WhatsApp Us", EMAIL_BRAND.whatsappHref),
  })
}

// ── Email: guest payment confirmation ─────────────────────────────────────────

export function buildGuestConfirmEmail(ctx: PaymentContext) {
  const amount      = fmtAmount(ctx.amountPaid)
  const checkinFmt  = fmtDate(ctx.checkin)
  const checkoutFmt = fmtDate(ctx.checkout)
  const { firstname, full } = resolveGuestName(ctx)
  const c = EMAIL_COLORS

  const stayDetails = `<tr><td style="padding:32px 40px 24px;">
    <p style="margin:0 0 16px;color:${c.muted};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Your Stay</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid ${c.border};">
      <tr>
        <td width="50%" style="background:${c.white};padding:16px 20px;border-right:1px solid ${c.border};border-bottom:1px solid ${c.border};">
          <p style="margin:0;color:${c.muted};font-size:9px;text-transform:uppercase;letter-spacing:1.5px;">Room</p>
          <p style="margin:5px 0 0;color:${c.black};font-size:14px;font-weight:600;">${ctx.roomTypeName || "—"}</p>
        </td>
        <td width="50%" style="background:${c.sand};padding:16px 20px;border-bottom:1px solid ${c.border};">
          <p style="margin:0;color:${c.muted};font-size:9px;text-transform:uppercase;letter-spacing:1.5px;">Guest</p>
          <p style="margin:5px 0 0;color:${c.black};font-size:14px;font-weight:600;">${full}</p>
        </td>
      </tr>
      <tr>
        <td width="50%" style="background:${c.sand};padding:16px 20px;border-right:1px solid ${c.border};border-bottom:1px solid ${c.border};">
          <p style="margin:0;color:${c.muted};font-size:9px;text-transform:uppercase;letter-spacing:1.5px;">Check-in</p>
          <p style="margin:5px 0 0;color:${c.black};font-size:15px;font-weight:700;">${checkinFmt}</p>
          <p style="margin:3px 0 0;color:${c.muted};font-size:11px;">From 14:00</p>
        </td>
        <td width="50%" style="background:${c.white};padding:16px 20px;border-bottom:1px solid ${c.border};">
          <p style="margin:0;color:${c.muted};font-size:9px;text-transform:uppercase;letter-spacing:1.5px;">Check-out</p>
          <p style="margin:5px 0 0;color:${c.black};font-size:15px;font-weight:700;">${checkoutFmt}</p>
          <p style="margin:3px 0 0;color:${c.muted};font-size:11px;">By 10:00</p>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="background:${c.black};padding:14px 20px;text-align:center;">
          <p style="margin:0;color:${c.muted};font-size:10px;letter-spacing:1px;">Paystack Reference &nbsp;&middot;&nbsp; <span style="color:${c.gold};">${ctx.reference || ctx.bookingRef || "—"}</span></p>
        </td>
      </tr>
    </table>
  </td></tr>`

  const gettingThere = `<tr><td style="padding:0 40px 24px;">
    <p style="margin:0 0 16px;color:${c.muted};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Getting There</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid ${c.border};">
      <tr><td style="background:${c.white};padding:18px 20px;border-bottom:1px solid ${c.border};">
        <p style="margin:0 0 4px;color:${c.muted};font-size:9px;text-transform:uppercase;letter-spacing:1.5px;">Address</p>
        <p style="margin:0;color:${c.black};font-size:14px;font-weight:600;">Riviera Park, Mahikeng</p>
        <p style="margin:2px 0 0;color:${c.muted};font-size:12px;">North West Province, 2745, South Africa</p>
        <p style="margin:2px 0 0;color:${c.muted};font-size:11px;">Approx. 5 min from Mmabatho CBD</p>
      </td></tr>
      <tr><td style="background:${c.sand};padding:18px 20px;border-bottom:1px solid ${c.border};">
        <p style="margin:0 0 4px;color:${c.muted};font-size:9px;text-transform:uppercase;letter-spacing:1.5px;">GPS Coordinates</p>
        <p style="margin:0;color:${c.black};font-size:13px;font-weight:600;letter-spacing:0.5px;">-25.8658, 25.6442</p>
      </td></tr>
      <tr><td style="background:${c.white};padding:18px 20px;">
        <p style="margin:0 0 10px;color:${c.muted};font-size:9px;text-transform:uppercase;letter-spacing:1.5px;">Directions</p>
        <a href="https://www.google.com/maps/dir/?api=1&destination=Riviera+Park+Mahikeng,+South+Africa" style="display:inline-block;background:${c.black};color:${c.gold};text-decoration:none;font-size:12px;font-weight:600;padding:10px 22px;border-radius:8px;letter-spacing:1px;">Open in Google Maps</a>
      </td></tr>
    </table>
  </td></tr>`

  const contactUs = `<tr><td style="padding:0 40px 24px;">
    <p style="margin:0 0 16px;color:${c.muted};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Contact Us</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid ${c.border};">
      <tr>
        <td width="50%" style="background:${c.white};padding:16px 20px;border-right:1px solid ${c.border};">
          <p style="margin:0 0 4px;color:${c.muted};font-size:9px;text-transform:uppercase;letter-spacing:1.5px;">Phone</p>
          <a href="${EMAIL_BRAND.phoneHref}" style="color:${c.black};text-decoration:none;font-size:14px;font-weight:600;">${EMAIL_BRAND.phone}</a>
        </td>
        <td width="50%" style="background:${c.sand};padding:16px 20px;">
          <p style="margin:0 0 4px;color:${c.muted};font-size:9px;text-transform:uppercase;letter-spacing:1.5px;">Email</p>
          <a href="mailto:${EMAIL_BRAND.email}" style="color:${c.black};text-decoration:none;font-size:13px;font-weight:600;">${EMAIL_BRAND.email}</a>
        </td>
      </tr>
      <tr><td colspan="2" style="background:${c.black};padding:16px 20px;text-align:center;">
        <a href="https://wa.me/27828757018?text=Hi%20Boga%20Legaba%2C%20my%20booking%20reference%20is%20${encodeURIComponent(ctx.bookingRef || "")}" style="display:inline-block;background:${c.gold};color:${c.black};text-decoration:none;font-size:13px;font-weight:700;padding:12px 28px;border-radius:8px;letter-spacing:0.5px;">WhatsApp Us</a>
        <p style="margin:10px 0 0;color:${c.muted};font-size:10px;">Your booking reference will be pre-filled in the message</p>
      </td></tr>
    </table>
  </td></tr>`

  const goodToKnow = `<tr><td style="padding:0 40px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;background:${c.sand};border:1px solid ${c.border};">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 12px;color:${c.black};font-size:12px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">Good to Know</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${[
            "Early check-in and late check-out available on request &mdash; contact us in advance",
            "Breakfast is served from 07:00 &mdash; please notify us of any dietary requirements",
            "Free secure parking is available on-site",
            "Need to cancel or modify? Contact us via WhatsApp at least 48 hours before arrival",
            "The property is non-smoking &mdash; designated outdoor areas available",
          ]
            .map(
              (item) => `<tr><td style="padding:5px 0;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="width:20px;color:${c.gold};font-size:14px;font-weight:700;vertical-align:top;">&#8250;</td>
              <td style="color:${c.bodyText};font-size:12px;line-height:1.7;">${item}</td>
            </tr></table>
          </td></tr>`,
            )
            .join("")}
        </table>
      </td></tr>
    </table>
  </td></tr>`

  return emailShell({
    title: "Payment Confirmed – Boga Legaba",
    preheader: `Your stay is confirmed. Booking reference ${ctx.bookingRef || ""} · ${amount} paid.`,
    accentBarColor: c.gold,
    footerNote: "Payment processed securely via Paystack &middot; Please keep this email as proof of payment.",
    bodyHtml:
      emailHero({ eyebrow: "Payment Successful", heading: `Your stay is confirmed,<br><span style="color:${c.gold};">${firstname}</span>` }) +
      `<tr><td style="background:${c.sand};padding:32px 40px;text-align:center;">
        <p style="margin:0 0 10px;color:${c.muted};font-size:10px;letter-spacing:2.5px;text-transform:uppercase;">Booking Reference</p>
        <p style="margin:0;color:${c.black};font-size:38px;font-weight:700;letter-spacing:4px;font-family:'Playfair Display',Georgia,serif;">${ctx.bookingRef || "—"}</p>
        <p style="margin:10px 0 0;color:${c.muted};font-size:11px;line-height:1.6;">Quote this number if you contact us about your stay</p>
      </td></tr>
      <tr><td style="background:${c.black};padding:28px 40px;text-align:center;">
        <p style="margin:0 0 8px;color:${c.muted};font-size:10px;letter-spacing:2.5px;text-transform:uppercase;">Amount Paid</p>
        <p style="margin:0;color:${c.gold};font-size:44px;font-weight:700;font-family:'Playfair Display',Georgia,serif;letter-spacing:1px;">${amount}</p>
        <p style="margin:10px 0 0;color:${c.muted};font-size:11px;">Paid securely via Paystack &middot; VAT included</p>
      </td></tr>` +
      stayDetails + gettingThere + contactUs + goodToKnow,
  })
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
  const rows: InfoRow[] = []
  if (bookingRef) rows.push({ label: "Booking Reference", value: bookingRef })
  rows.push({ label: "Room", value: roomTypeName || "—" })
  rows.push({ label: "Check-in", value: fmtDate(checkin) })
  rows.push({ label: "Check-out", value: fmtDate(checkout) })
  if (estimatedTotal) rows.push({ label: "Amount Due", value: estimatedTotal, emphasis: true })

  return emailShell({
    title: "Booking Reserved – Boga Legaba",
    preheader: `Your room is reserved. Booking reference ${bookingRef || ""}.`,
    bodyHtml:
      emailParagraph(
        `Dear <strong style="color:${EMAIL_COLORS.bodyText};">${guestName || "Guest"}</strong>,<br>Your room has been reserved. You were redirected to complete payment — if payment didn't go through, please contact us via WhatsApp and quote your booking reference.`,
      ) +
      emailInfoTable(rows) +
      emailCallout(
        "<strong>&#9888; Awaiting Payment</strong><br>Your booking is held for 24 hours. If payment did not complete, please contact us via WhatsApp and we will assist you.",
        { tone: "warning" },
      ) +
      emailButton("WhatsApp Us", EMAIL_BRAND.whatsappHref),
    footerNote: "This is an automated notification. Please keep it for your records.",
  })
}

// ── Email: admin payment notification ─────────────────────────────────────────

export function buildAdminPaymentEmail(ctx: PaymentContext, booked: boolean = true) {
  const amount      = fmtAmount(ctx.amountPaid)
  const now         = new Date().toLocaleString("en-ZA", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Johannesburg" })
  const { firstname, surname, full } = resolveGuestName(ctx)

  const rows: InfoRow[] = [
    { label: "First Name", value: firstname },
    { label: "Surname", value: surname },
    { label: "Email", value: ctx.guestEmail || "—" },
    { label: "Phone", value: ctx.guestPhone || "—" },
    { label: "Booking Reference", value: ctx.bookingRef || "—" },
    { label: "Room", value: ctx.roomTypeName || "—" },
    { label: "Check-in", value: fmtDate(ctx.checkin) },
    { label: "Check-out", value: fmtDate(ctx.checkout) },
    { label: "Amount Paid", value: amount, emphasis: true },
  ]

  const statusNote = booked
    ? `NightsBridge booking status has been automatically updated to <strong style="color:${EMAIL_COLORS.bodyText};">Confirmed</strong>. Log into NightsBridge to view or manage this booking.`
    : `<strong style="color:${EMAIL_COLORS.danger};">This booking was NOT created on NightsBridge</strong> — see the separate follow-up alert for details and next steps.`

  return emailShell({
    title: "New Payment Received",
    eyebrow: "Admin Notification",
    bodyHtml:
      `<tr><td style="padding:32px 40px 8px;">
        <p style="margin:0 0 4px;color:${EMAIL_COLORS.muted};font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">New Payment Received</p>
        <p style="margin:0;color:${EMAIL_COLORS.black};font-size:22px;font-weight:400;font-family:'Playfair Display',Georgia,serif;">${full}</p>
        <p style="margin:4px 0 0;color:${EMAIL_COLORS.muted};font-size:12px;">${now}</p>
      </td></tr>` +
      emailInfoTable(rows, { title: "Guest & Booking Information" }) +
      emailCallout(statusNote, { tone: booked ? "neutral" : "danger" }),
    footerNote: "Automated admin notification · Do not reply to this email.",
  })
}

// ── Email: NightsBridge confirm failure alert ──────────────────────────────────

export function buildNBFailureEmail(ctx: PaymentContext, refunded: boolean = false) {
  const amount = fmtAmount(ctx.amountPaid)
  const { full } = resolveGuestName(ctx)

  const heading = refunded ? "Booking Failed — Guest Auto-Refunded" : "Booking Failed — Manual Refund Required"
  const message = refunded
    ? `Payment was received but we could not automatically create this booking on NightsBridge. The guest has already been <strong style="color:${EMAIL_COLORS.bodyText};">refunded in full</strong> via Paystack — no further action is needed unless you want to follow up with the guest directly.`
    : `Payment was received but we could not automatically create this booking on NightsBridge, <strong style="color:${EMAIL_COLORS.danger};">and the automatic refund also failed</strong>. Please refund the guest manually via the Paystack dashboard and follow up with them directly.`

  const rows: InfoRow[] = [
    { label: "Guest", value: full },
    { label: "Email", value: ctx.guestEmail || "—" },
    { label: "Phone", value: ctx.guestPhone || "—" },
    { label: "Room requested", value: ctx.roomTypeName || "—" },
    { label: "Check-in", value: fmtDate(ctx.checkin) },
    { label: "Check-out", value: fmtDate(ctx.checkout) },
    { label: "Paystack Reference", value: ctx.reference || "—" },
    { label: "Amount", value: amount, emphasis: true },
  ]

  return emailShell({
    title: "Action Required – Boga Legaba",
    eyebrow: "Admin Alert",
    accentBarColor: EMAIL_COLORS.danger,
    bodyHtml:
      `<tr><td style="padding:32px 40px 20px;">
        <p style="margin:0 0 8px;color:${EMAIL_COLORS.danger};font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">&#9888; ${refunded ? "Refunded automatically" : "Action Required"}</p>
        <p style="margin:0;color:${EMAIL_COLORS.black};font-size:20px;font-weight:400;font-family:'Playfair Display',Georgia,serif;">${heading}</p>
        <p style="margin:8px 0 0;color:${EMAIL_COLORS.muted};font-size:13px;line-height:1.7;">${message}</p>
      </td></tr>` +
      emailInfoTable(rows),
    footerNote: "Admin alert · Boga Legaba booking system.",
  })
}
