import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getBookingJob } from "@/lib/booking-job"

export const dynamic = "force-dynamic"

async function isAuthenticated() {
  const store = await cookies()
  return store.get("bl_admin_session")?.value === process.env.ADMIN_SECRET
}

/**
 * Polled by the admin "Retry to NightsBridge" button after it dispatches a
 * job. /api/admin/retry-nightsbridge only confirms the worker ACCEPTED the
 * job (HTTP 202) — the actual Playwright run takes up to a few minutes and
 * happens in a background thread on the worker. Without this poll the button
 * had no way to tell "accepted" apart from "actually booked", so it showed
 * "Sent" the instant the worker answered, even if the booking later failed.
 */
export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const reference = new URL(request.url).searchParams.get("reference") ?? ""
  if (!reference) {
    return NextResponse.json({ ok: false, error: "reference is required" }, { status: 400 })
  }

  const { job, dbError } = await getBookingJob(reference)
  if (dbError) {
    return NextResponse.json({ ok: false, error: `Could not read booking: ${dbError}` }, { status: 502 })
  }
  if (!job) {
    return NextResponse.json({ ok: false, error: "Booking not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true, status: job.status, booking_id: job.booking_id, error: job.error })
}
