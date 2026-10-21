import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * POST /api/unsubscribe - one-click mailing-list removal.
 *
 * Accepts the address as JSON { email } (our /unsubscribe page) or as a
 * ?email= query parameter with an empty/bodyless POST (Gmail one-click:
 * List-Unsubscribe-Post delivers `List-Unsubscribe=One-Click` with no JSON).
 * Marks every matching enquiry row unsubscribed. No auth by design - the
 * address itself is the identifier, as with any list-unsubscribe URL.
 */
export async function POST(request: NextRequest) {
  let email = new URL(request.url).searchParams.get("email") ?? ""
  const contentType = request.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { email?: string } | null
    if (body?.email) email = body.email
  }
  email = email.trim().toLowerCase()
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "A valid email address is required." }, { status: 400 })
  }

  try {
    const sb = createSupabaseAdminClient()
    // Escape LIKE wildcards so an address containing _ or % can only ever
    // match itself (ilike is used for case-insensitive comparison).
    const pattern = email.replace(/[\\%_]/g, (c) => `\\${c}`)
    const { error, count } = await sb
      .from("enquiry")
      .update({ unsubscribed: true, unsubscribed_at: new Date().toISOString() }, { count: "exact" })
      .ilike("email", pattern)
    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true, removed: count ?? 0 })
  } catch (err) {
    // Most likely cause: migration 021 not applied yet. The caller shows the
    // mailto fallback so nobody is left subscribed against their will.
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Could not unsubscribe. Please email us instead." },
      { status: 502 },
    )
  }
}
