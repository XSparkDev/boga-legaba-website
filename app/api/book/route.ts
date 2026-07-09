import { NextRequest, NextResponse } from "next/server"
import { checkRoomTypeAvailableLive } from "@/lib/nightsbridge-api"
import { Resend } from "resend"
import { buildGuestPendingEmail } from "@/lib/payment-utils"

// The worker now retries internally (up to 3 attempts) on ambiguous/transient
// booking failures — allow enough time for that instead of aborting early
// while the worker is still legitimately working.
export const maxDuration = 350

const NB_BBID = 21091

const REQUIRED = [
  "checkin", "checkout", "roomTypeName", "mealPlanName",
  "firstname", "surname", "phone", "email",
] as const

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 })
  }

  const missing = REQUIRED.filter((k) => !body[k])
  if (missing.length) {
    return NextResponse.json(
      { ok: false, error: `Missing fields: ${missing.join(", ")}` },
      { status: 400 },
    )
  }

  // ── Real-time availability gate ──────────────────────────────────────────
  // Ask NightsBridge directly, right now (no cache), whether a room of this type
  // is actually free for these exact dates. This catches the case where the
  // browsed calendar was slightly stale and the room was taken in the meantime —
  // so the guest gets a clean message instead of a failed booking at the very end.
  // "unknown" (NB unreachable) does NOT block: Playwright + NightsBridge remain the
  // authoritative final gatekeeper and will reject a genuinely unavailable room.
  const bbid = typeof body.bbid === "number" ? body.bbid : NB_BBID
  const live = await checkRoomTypeAvailableLive(
    bbid,
    String(body.roomTypeName),
    String(body.checkin),
    String(body.checkout),
  )
  if (live.status === "unavailable") {
    return NextResponse.json(
      {
        ok: false,
        error: `Sorry — ${body.roomTypeName} was just taken for ${body.checkin} to ${body.checkout}. Please choose different dates or another room.`,
      },
      { status: 409 },
    )
  }

  const workerUrl = process.env.SYNC_WORKER_URL
  const cronSecret = process.env.CRON_SECRET

  if (!workerUrl || !cronSecret) {
    return NextResponse.json(
      { ok: false, error: "Booking service is not configured" },
      { status: 503 },
    )
  }

  const baseUrl = workerUrl.replace(/\/run$/, "")

  // Pre-warm the sync worker — fires an unauthenticated GET to /health which wakes
  // a sleeping Render free-tier service before we send the real booking request.
  fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(10_000) }).catch(() => {})

  try {
    const res = await fetch(`${baseUrl}/book`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      // Must exceed the worker's own timeout (340s, including its internal
      // retries) so we never abort while a booking is still legitimately in
      // progress — an abort here means an admin sees "failed" for a booking
      // that actually succeeds a few seconds later.
      signal: AbortSignal.timeout(345_000),
    })

    const data = (await res.json()) as Record<string, unknown>

    // After a successful booking, send the guest a "pending payment" email so they
    // have booking details in their inbox even if they close the browser before paying.
    if (res.ok && data.ok) {
      const resendKey = process.env.RESEND_API_KEY
      if (resendKey && resendKey !== "re_REPLACE_ME") {
        const guestEmail = String(body.email ?? "")
        if (guestEmail) {
          const resend = new Resend(resendKey)
          const from   = process.env.RESEND_FROM_EMAIL ?? "Boga Legaba <onboarding@resend.dev>"
          const conf   = (data.confirmation ?? {}) as Record<string, string>
          resend.emails.send({
            from,
            to:      guestEmail,
            subject: "Your Boga Legaba booking is reserved – complete payment",
            html:    buildGuestPendingEmail({
              guestName:      `${body.firstname ?? ""} ${body.surname ?? ""}`.trim(),
              bookingRef:     String(data.bookingRef ?? conf.bookingId ?? ""),
              checkin:        String(body.checkin ?? ""),
              checkout:       String(body.checkout ?? ""),
              roomTypeName:   String(body.roomTypeName ?? ""),
              estimatedTotal: conf.total ?? "",
            }),
          }).catch((err: unknown) => console.error("[book] Pending email error:", err))
        }
      }
    }

    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Booking request failed"
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
