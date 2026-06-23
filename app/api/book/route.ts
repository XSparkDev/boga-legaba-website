import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 90

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

  const workerUrl = process.env.SYNC_WORKER_URL
  const cronSecret = process.env.CRON_SECRET

  if (!workerUrl || !cronSecret) {
    return NextResponse.json(
      { ok: false, error: "Booking service is not configured" },
      { status: 503 },
    )
  }

  // SYNC_WORKER_URL may end with /run — strip that to get the base URL
  const bookUrl = workerUrl.replace(/\/run$/, "") + "/book"

  try {
    const res = await fetch(bookUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(85_000),
    })

    const data = (await res.json()) as Record<string, unknown>
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Booking request failed"
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
