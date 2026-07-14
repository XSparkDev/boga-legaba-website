import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { MIN_LIVE_REVIEWS } from "@/lib/google-reviews"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * POST /api/admin/reviews-sync — the admin dashboard's "Refresh Reviews from
 * Google" button posts here.
 *
 * Auth: the same `bl_admin_session` cookie that protects every other admin
 * route (NOT the CRON_SECRET). This is the boundary that lets a logged-in
 * admin trigger the sync from the browser.
 *
 * It then calls the existing /api/reviews/sync route server-to-server with the
 * CRON_SECRET — exactly how the scheduled job would. The CRON_SECRET is read
 * from the environment here and never reaches the browser.
 */
async function isAuthenticated() {
  const store = await cookies()
  return store.get("bl_admin_session")?.value === process.env.ADMIN_SECRET
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: "Sync not configured (CRON_SECRET missing)." }, { status: 503 })
  }

  // Same-origin call so this works in local dev and in production without a
  // hardcoded base URL.
  const origin = new URL(request.url).origin
  try {
    const res = await fetch(`${origin}/api/reviews/sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cronSecret}` },
    })
    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean
      fetched?: number
      inserted?: number
      updated?: number
      eligible?: number
      error?: string
      detail?: string
    }
    if (!res.ok || !body.ok) {
      return NextResponse.json(
        { ok: false, error: body.error ?? `Sync failed (${res.status})`, detail: body.detail },
        { status: res.status === 401 ? 500 : res.status }, // a 401 here is a server misconfig, not the admin's fault
      )
    }

    const eligible = body.eligible ?? 0
    return NextResponse.json({
      ok: true,
      fetched: body.fetched ?? 0,
      inserted: body.inserted ?? 0,
      updated: body.updated ?? 0,
      eligible,
      threshold: MIN_LIVE_REVIEWS,
      // Whether the homepage will actually switch to the live reviews now.
      homepageShowsLive: eligible >= MIN_LIVE_REVIEWS,
    })
  } catch {
    return NextResponse.json({ ok: false, error: "Could not reach the sync route." }, { status: 502 })
  }
}
