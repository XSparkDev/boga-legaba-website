/**
 * Shared utilities for the booking + payment flow: BOOK-FIRST — the guest's
 * room is created on NightsBridge before payment is ever requested (see
 * /api/booking/start + /api/booking/status), then Paystack only confirms
 * payment for an already-real booking.
 */
import { Resend } from "resend"
import { emailShell, emailHero, emailInfoTable, emailButton, emailCallout, emailParagraph, EMAIL_COLORS, EMAIL_BRAND, type InfoRow } from "@/lib/email-theme"

// ── Paystack session creation ───────────────────────────────────────────────

export type InitiatePaymentArgs = {
  email: string
  amountRands: number
  bookingRef: string
  guestName?: string
  guestPhone?: string
  checkin?: string
  checkout?: string
  roomTypeName?: string
  /** The exact physical room (e.g. "Red Room") — see PaymentContext.roomName. */
  roomName?: string
  /** booking_job.reference (e.g. "BLJOB-...") — DIFFERENT from bookingRef,
   * which is the NightsBridge booking id shown to guests. Threaded through
   * Paystack metadata so the webhook/verify callback (which only receives
   * Paystack's own transaction reference) can look up and transition the
   * right booking_job row in the state machine. */
  internalReference?: string
}

export type InitiatePaymentResult =
  | { ok: true; authorization_url: string; reference: string }
  | { ok: false; error: string }

/**
 * Create ONE Paystack checkout session for a booking. Extracted so it can be
 * called from two places that must share the exact same session — the
 * guest's browser redirect AND the "booking reserved" email's fallback
 * link — without creating two separate Paystack transactions for one
 * booking (a real double-charge risk if a guest used both links).
 */
export async function initiatePaystackPayment(args: InitiatePaymentArgs): Promise<InitiatePaymentResult> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey || secretKey === "sk_test_REPLACE_ME") {
    return { ok: false, error: "Payment not configured" }
  }
  if (!args.email || !args.amountRands || !args.bookingRef) {
    return { ok: false, error: "Missing email, amountRands or bookingRef" }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bogalegaba.co.za"
  const reference = `BL-${args.bookingRef}-${Date.now()}`
  const callbackUrl = `${siteUrl}/api/payment/verify`

  try {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: args.email,
        amount: Math.round(args.amountRands * 100), // kobo / cents
        reference,
        callback_url: callbackUrl,
        currency: "ZAR",
        metadata: {
          booking: {
            bookingRef: args.bookingRef,
            internalReference: args.internalReference ?? "",
            guestEmail: args.email,
            guestName: args.guestName ?? "",
            guestPhone: args.guestPhone ?? "",
            checkin: args.checkin ?? "",
            checkout: args.checkout ?? "",
            roomTypeName: args.roomTypeName ?? "",
            roomName: args.roomName ?? "",
          },
          custom_fields: [
            { display_name: "Booking Ref", variable_name: "booking_ref", value: args.bookingRef },
            { display_name: "Room",        variable_name: "room",        value: args.roomName || args.roomTypeName || "" },
            { display_name: "Check-in",    variable_name: "checkin",     value: args.checkin ?? "" },
            { display_name: "Check-out",   variable_name: "checkout",    value: args.checkout ?? "" },
            { display_name: "Phone",       variable_name: "guest_phone", value: args.guestPhone ?? "" },
          ],
        },
      }),
    })
    const data = (await res.json()) as { status: boolean; message: string; data?: { authorization_url: string; reference: string } }
    if (!data.status || !data.data) {
      return { ok: false, error: data.message || "Paystack init failed" }
    }
    return { ok: true, authorization_url: data.data.authorization_url, reference: data.data.reference }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Payment initiation failed" }
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

/**
 * The exact physical room (e.g. "Red Room") if known, otherwise the category
 * (e.g. "Double Room (Bath only)") as a fallback for bookings made via the
 * old guest-widget flow, which never learns the specific unit. Guests should
 * always see this, not the raw category, wherever the room is displayed.
 */
function resolveRoomLabel(roomName?: string, roomTypeName?: string): string {
  return roomName || roomTypeName || "—"
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
  /** The exact physical room booked (e.g. "Red Room"), known once the
   * admin-calendar booking succeeds — prefer this over roomTypeName
   * wherever the room is shown to the guest. Absent for the old
   * guest-widget flow, which never learns the specific unit. */
  roomName?:    string
  amountPaid:   number
  // Full booking payload — used to CREATE the booking (book-first flow: this
  // happens BEFORE payment is requested, via /api/booking/start).
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

/** The exact payload the NightsBridge worker's /book endpoint expects. */
function buildWorkerBookingPayload(ctx: PaymentContext, extra: Record<string, unknown> = {}) {
  const [firstname, ...rest] = (ctx.guestName || "").trim().split(/\s+/)
  return {
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
    ...extra,
  }
}

/**
 * Fire the worker's ASYNC booking: the worker starts the ~50s booking in the
 * background, records the outcome in booking_job (keyed by the payment
 * reference), and returns 202 immediately. This call therefore returns fast —
 * nothing waits on the booking. Returns true if the worker accepted the job.
 */
export async function triggerAsyncBooking(ctx: PaymentContext): Promise<boolean> {
  const workerUrl  = (process.env.SYNC_WORKER_URL ?? "").replace(/\/run$/, "")
  const cronSecret = process.env.CRON_SECRET
  if (!workerUrl || !cronSecret) {
    console.error(`[payment] triggerAsyncBooking reference=${ctx.reference}: SYNC_WORKER_URL / CRON_SECRET not set`)
    return false
  }
  const payload = buildWorkerBookingPayload(ctx, { async: true, reference: ctx.reference })
  // Guard against the worker's own required-field validation rejecting the
  // request server-side (e.g. an empty surname when guestName is a single
  // word) — that would make triggerAsyncBooking return false, but by then
  // ensurePendingBookingJob has ALREADY written a "pending" row, so log the
  // exact payload shape sent so a rejection reason is traceable, not guessed.
  console.log(`[payment] triggerAsyncBooking reference=${ctx.reference} POST ${workerUrl}/book firstname="${payload.firstname}" surname="${payload.surname}" room="${payload.roomTypeName}"`)
  try {
    const res = await fetch(`${workerUrl}/book`, {
      method:  "POST",
      headers: { Authorization: `Bearer ${cronSecret}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // Only kicking off the job — the worker returns 202 in well under a second.
      signal: AbortSignal.timeout(30_000),
    })
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; accepted?: boolean; error?: string }
    const accepted = res.status === 202 || data.accepted === true || data.ok === true
    if (!accepted) {
      console.error(`[payment] triggerAsyncBooking reference=${ctx.reference} REJECTED by worker: HTTP ${res.status} — ${data.error ?? "(no error message)"}`)
    } else {
      console.log(`[payment] triggerAsyncBooking reference=${ctx.reference} ACCEPTED (HTTP ${res.status})`)
    }
    return accepted
  } catch (err) {
    console.error(`[payment] triggerAsyncBooking reference=${ctx.reference} EXCEPTION:`, err instanceof Error ? err.message : err)
    return false
  }
}

/**
 * BOOK-FIRST FLOW: the NightsBridge booking is now created BEFORE payment is
 * ever requested (see /api/booking/start + /api/booking/status). By the time
 * Paystack confirms a successful payment, the room is already reserved — so
 * this just sends the final "Payment Confirmed" email to the guest and a
 * notification to admin. It never creates or retries a booking.
 *
 * If the guest's payment fails or they abandon checkout, the booking is left
 * as-is (the guest already received NightsBridge's own reservation email) —
 * per business decision, nothing is auto-cancelled or refunded.
 */
export async function sendPaymentConfirmedEmails(ctx: PaymentContext): Promise<void> {
  const resendKey  = process.env.RESEND_API_KEY
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL ?? "bogalegaba@gmail.com"
  const from       = process.env.RESEND_FROM_EMAIL ?? "Boga Legaba <onboarding@resend.dev>"
  if (!resendKey || resendKey === "re_REPLACE_ME") return

  const resend = new Resend(resendKey)
  const guestFullName = resolveGuestName(ctx).full

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
      subject: `New Payment – ${guestFullName} · ${ctx.bookingRef || "no ref"}`,
      html:    buildAdminPaymentEmail(ctx, true),
    })
  } catch (err) {
    console.error("[payment] Admin notification email error:", err)
  }
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
          <p style="margin:5px 0 0;color:${c.black};font-size:14px;font-weight:600;">${resolveRoomLabel(ctx.roomName, ctx.roomTypeName)}</p>
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

  const registrationHref = `${EMAIL_BRAND.websiteHref}/register?ref=${encodeURIComponent(ctx.bookingRef || "")}`
  const registrationCta =
    emailCallout(
      `<strong style="color:${c.bodyText};">One more step — complete your guest registration.</strong><br>` +
        `Please fill in your digital check-in details before you arrive so we have everything ready for you.`,
      { tone: "warning" },
    ) + emailButton("Complete Guest Registration", registrationHref)

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
      stayDetails + registrationCta + gettingThere + contactUs + goodToKnow,
  })
}

// ── Email: guest booking pending (before payment) ─────────────────────────────

export function buildGuestPendingEmail({
  guestName,
  bookingRef,
  checkin,
  checkout,
  roomTypeName,
  roomName,
  estimatedTotal,
  paymentUrl,
}: {
  guestName:      string
  bookingRef:     string
  checkin:        string
  checkout:       string
  roomTypeName:   string
  /** The exact physical room (e.g. "Red Room") — see resolveRoomLabel(). */
  roomName?:      string
  estimatedTotal: string
  /** The SAME Paystack session used for the browser redirect — a fallback
   * link in case the guest closed the tab or the redirect didn't fire.
   * Omitted entirely (no payment section) if pre-generation failed. */
  paymentUrl?:    string
}) {
  const rows: InfoRow[] = []
  if (bookingRef) rows.push({ label: "Booking Reference", value: bookingRef })
  rows.push({ label: "Room", value: resolveRoomLabel(roomName, roomTypeName) })
  rows.push({ label: "Check-in", value: fmtDate(checkin) })
  rows.push({ label: "Check-out", value: fmtDate(checkout) })
  if (estimatedTotal) rows.push({ label: "Amount Due", value: estimatedTotal, emphasis: true })

  return emailShell({
    title: "Booking Reserved – Boga Legaba",
    preheader: `Your room is reserved. Booking reference ${bookingRef || ""}.`,
    bodyHtml:
      emailParagraph(
        `Dear <strong style="color:${EMAIL_COLORS.bodyText};">${guestName || "Guest"}</strong>,<br>Your room has been reserved at Boga Legaba. Please see your booking details below.`,
      ) +
      emailInfoTable(rows) +
      (paymentUrl
        ? emailCallout(
            `<strong>Complete your payment</strong><br>If you were not redirected to payment, you can complete payment here: <a href="${paymentUrl}" style="color:${EMAIL_COLORS.gold};font-weight:600;">${paymentUrl}</a>.<br>If you have already paid, please disregard this link.`,
            { tone: "warning" },
          )
        : emailCallout(
            "<strong>&#9888; Payment link unavailable</strong><br>We couldn't generate a payment link automatically — please contact us via WhatsApp and quote your booking reference to arrange payment.",
            { tone: "warning" },
          )) +
      (paymentUrl ? emailButton("Complete Payment", paymentUrl) : emailButton("WhatsApp Us", EMAIL_BRAND.whatsappHref)),
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
    { label: "Room", value: resolveRoomLabel(ctx.roomName, ctx.roomTypeName) },
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

