import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * ⚠️ BUILT & TESTED, BUT INTENTIONALLY DORMANT — NOT SCHEDULED (as of 2026-07-14).
 *
 * This route works end-to-end (verified: fetch → upsert → idempotent re-run),
 * but it is deliberately NOT wired to any cron job or scheduled trigger yet.
 * Reason: the live Google Places API currently returns only 5 reviews for this
 * listing, and just 2 of them clear the 3-star display filter — running the
 * sync would flip the homepage from the 13 curated `manual_seed` reviews to
 * only 2 live ones (getGuestReviews() prefers `live_api` rows once any exist),
 * making the section look sparse.
 *
 * Until then the site intentionally serves the curated `manual_seed` set.
 * REVISIT once the real Google listing has accumulated more recent, positive
 * reviews (enough ≥3-star ones to match or beat the curated set); at that point
 * add a scheduled trigger and let the live rows take over.
 *
 * POST /api/reviews/sync — server-only, CRON_SECRET protected.
 *
 * Pulls the latest Google Places reviews for GOOGLE_PLACE_ID and upserts them
 * into the `google_reviews` table with source = 'live_api', so they can be
 * told apart from (and preferred over) the initial 'manual_seed' rows. Repeat
 * runs are idempotent: a live row is matched on (author_name, relative_time)
 * and updated in place rather than duplicated.
 *
 * SECURITY: the Google API key is read from the environment and sent only in
 * the request header. It is never returned in a response, never logged, and
 * never included in any error message.
 */

type PlacesReview = {
  authorAttribution?: { displayName?: string }
  rating?: number
  text?: { text?: string }
  relativePublishTimeDescription?: string
}

type PlacesResponse = {
  reviews?: PlacesReview[]
}

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get("authorization")
  return auth === `Bearer ${secret}`
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  const placeId = process.env.GOOGLE_PLACE_ID
  // Note: never echo apiKey — only report WHICH var is missing, not its value.
  if (!apiKey || !placeId) {
    return NextResponse.json(
      { error: "Reviews sync not configured, set GOOGLE_PLACES_API_KEY and GOOGLE_PLACE_ID." },
      { status: 503 },
    )
  }

  // ── 1. Fetch from Google Places (New) v1 ────────────────────────────────────
  let payload: PlacesResponse
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "displayName,rating,userRatingCount,reviews",
      },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    })
    if (!res.ok) {
      // Google's error body describes the problem (e.g. API not enabled) and
      // does NOT contain the key — but we still surface only a short, sanitized
      // message and the status code, never the request or its headers.
      let detail = ""
      try {
        const body = (await res.json()) as { error?: { message?: string } }
        detail = body?.error?.message ?? ""
      } catch {
        /* non-JSON error body — ignore */
      }
      return NextResponse.json(
        { error: `Google Places API returned ${res.status}`, detail: detail || undefined },
        { status: 502 },
      )
    }
    payload = (await res.json()) as PlacesResponse
  } catch {
    // Network/timeout — never include the URL+key context in the message.
    return NextResponse.json({ error: "Could not reach the Google Places API." }, { status: 502 })
  }

  // ── 2. Normalise → the google_reviews shape ─────────────────────────────────
  const incoming = (payload.reviews ?? [])
    .map((r) => ({
      author_name: (r.authorAttribution?.displayName ?? "").trim(),
      rating: typeof r.rating === "number" ? Math.round(r.rating) : 0,
      review_text: (r.text?.text ?? "").trim(),
      relative_time: (r.relativePublishTimeDescription ?? "").trim(),
    }))
    // Drop anything unusable (Google occasionally returns rating-only reviews).
    .filter((r) => r.author_name && r.review_text && r.rating >= 1 && r.rating <= 5)

  // How many of the fetched reviews clear the ≥3-star display threshold — i.e.
  // how many could actually appear on the homepage (see getGuestReviews()).
  const eligible = incoming.filter((r) => r.rating >= 3).length

  if (incoming.length === 0) {
    return NextResponse.json({ ok: true, fetched: 0, inserted: 0, updated: 0, eligible: 0 })
  }

  // ── 3. Upsert into google_reviews (dedupe on author_name + relative_time) ───
  const sb = createSupabaseAdminClient()
  const keyOf = (r: { author_name: string; relative_time: string }) => `${r.author_name}||${r.relative_time}`

  // Existing live rows, so repeat runs update rather than duplicate.
  const { data: existingRows, error: readErr } = await sb
    .from("google_reviews")
    .select("id, author_name, relative_time")
    .eq("source", "live_api")
  if (readErr) {
    return NextResponse.json({ error: "Database read failed while syncing reviews." }, { status: 500 })
  }

  const existingById = new Map<string, number>()
  for (const row of existingRows ?? []) {
    existingById.set(keyOf(row as { author_name: string; relative_time: string }), (row as { id: number }).id)
  }

  const toInsert = incoming.filter((r) => !existingById.has(keyOf(r)))
  const toUpdate = incoming
    .map((r) => ({ id: existingById.get(keyOf(r)), r }))
    .filter((x): x is { id: number; r: (typeof incoming)[number] } => typeof x.id === "number")

  let inserted = 0
  let updated = 0

  if (toInsert.length > 0) {
    const { error: insErr } = await sb
      .from("google_reviews")
      .insert(toInsert.map((r) => ({ ...r, source: "live_api" })))
    if (insErr) {
      return NextResponse.json({ error: "Database insert failed while syncing reviews." }, { status: 500 })
    }
    inserted = toInsert.length
  }

  for (const { id, r } of toUpdate) {
    const { error: updErr } = await sb
      .from("google_reviews")
      .update({ rating: r.rating, review_text: r.review_text })
      .eq("id", id)
    if (updErr) {
      return NextResponse.json({ error: "Database update failed while syncing reviews." }, { status: 500 })
    }
    updated += 1
  }

  return NextResponse.json({ ok: true, fetched: incoming.length, inserted, updated, eligible })
}
