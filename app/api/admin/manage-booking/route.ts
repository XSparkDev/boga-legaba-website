import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export const maxDuration = 90

async function isAuthenticated() {
  const store = await cookies()
  return store.get("bl_admin_session")?.value === process.env.ADMIN_SECRET
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 })
  }

  const { bookingRef, action } = body as { bookingRef?: string | number; action?: string }

  if (!bookingRef || !["checkin", "checkout"].includes(action ?? "")) {
    return NextResponse.json(
      { ok: false, error: "bookingRef and action (checkin|checkout) are required" },
      { status: 400 },
    )
  }

  const workerUrl = process.env.SYNC_WORKER_URL
  const cronSecret = process.env.CRON_SECRET

  if (!workerUrl || !cronSecret) {
    return NextResponse.json(
      { ok: false, error: "Worker service not configured" },
      { status: 503 },
    )
  }

  const manageUrl = workerUrl.replace(/\/run$/, "") + "/manage-booking"

  try {
    const res = await fetch(manageUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bookingRef, action }),
      signal: AbortSignal.timeout(85_000),
    })

    const data = (await res.json()) as Record<string, unknown>
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed"
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
