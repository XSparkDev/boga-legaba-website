import { NextRequest, NextResponse } from "next/server"
import { fetchNightsBridgeRates } from "@/lib/nightsbridge-rates"

export const dynamic = "force-dynamic"

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-ZA,en;q=0.9",
}

// ---------------------------------------------------------------------------
// Debug helpers — fetch raw responses from NightsBridge endpoints
// ---------------------------------------------------------------------------

async function rawFetch(url: string): Promise<{ status: number; contentType: string; body: string }> {
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(15_000),
      // No cache — debug should always be fresh
      cache: "no-store",
    })
    const body = await res.text()
    return {
      status: res.status,
      contentType: res.headers.get("content-type") ?? "",
      body,
    }
  } catch (err) {
    return { status: 0, contentType: "", body: `FETCH ERROR: ${String(err)}` }
  }
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

/**
 * GET /api/nightsbridge/rates?bbid=21091&arrive=YYYY-MM-DD&depart=YYYY-MM-DD
 *
 * Optional: &debug=raw      — fetch booking page, log length+sample, return first 5000 chars.
 *           &debug=1        — returns raw HTML/JSON from all probed endpoints as plain text.
 *           &debug=calendar — returns only the calendar.nightsbridge.com responses.
 *           &debug=booking  — returns only the book.nightsbridge.com HTML.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const bbid = searchParams.get("bbid") ? Number(searchParams.get("bbid")) : 21091
  const arrive = searchParams.get("arrive") ?? "2026-06-20"
  const depart = searchParams.get("depart") ?? "2026-06-22"
  const debug = searchParams.get("debug") ?? ""

  if (!arrive || !depart) {
    return NextResponse.json(
      { error: "Query params `arrive` and `depart` are required (YYYY-MM-DD)." },
      { status: 400 },
    )
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(arrive) || !/^\d{4}-\d{2}-\d{2}$/.test(depart)) {
    return NextResponse.json({ error: "Dates must be YYYY-MM-DD." }, { status: 400 })
  }
  if (arrive >= depart) {
    return NextResponse.json({ error: "`arrive` must be before `depart`." }, { status: 400 })
  }

  // ── debug=raw — minimal raw fetch, logs to server console ───────────────
  if (debug === "raw") {
    const url = `https://book.nightsbridge.com/${bbid}?arrive=${arrive}&depart=${depart}`
    let html = ""
    let status = 0
    let contentType = ""

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-ZA,en;q=0.9",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      })
      status = res.status
      contentType = res.headers.get("content-type") ?? ""
      html = await res.text()
    } catch (err) {
      html = `FETCH ERROR: ${String(err)}`
    }

    console.log("NB_HTML_LENGTH:", html.length)
    console.log("NB_HTML_SAMPLE:", html.substring(0, 3000))

    const body = [
      `URL: ${url}`,
      `HTTP status: ${status}`,
      `Content-Type: ${contentType}`,
      `Total length: ${html.length} chars`,
      "",
      "── First 5000 chars ──────────────────────────────────────────────────────",
      html.substring(0, 5000),
    ].join("\n")

    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    })
  }

  // ── debug=1 / debug=booking / debug=calendar — multi-endpoint probe ─────
  if (debug) {
    const probeUrls: string[] = []

    if (debug !== "calendar") {
      // Booking widget — main source for prices
      probeUrls.push(
        `https://book.nightsbridge.com/${bbid}?arrive=${arrive}&depart=${depart}`,
      )
      // Try format=json variant
      probeUrls.push(
        `https://book.nightsbridge.com/${bbid}?arrive=${arrive}&depart=${depart}&format=json`,
      )
    }

    if (debug !== "booking") {
      // Calendar availability endpoints (speculative — check if they exist)
      probeUrls.push(
        `https://calendar.nightsbridge.com/api/availability?bbid=${bbid}&arrive=${arrive}&depart=${depart}`,
      )
      probeUrls.push(
        `https://calendar.nightsbridge.com/?bbid=${bbid}&arrive=${arrive}&depart=${depart}`,
      )
      // Webservices endpoint
      probeUrls.push(
        `https://webservices.nightsbridge.com/availability?bbid=${bbid}&arrive=${arrive}&depart=${depart}`,
      )
    }

    const sections: string[] = []
    const sep = "═".repeat(80)

    for (const url of probeUrls) {
      console.log(`[NightsBridge Debug] Fetching: ${url}`)
      const { status, contentType, body } = await rawFetch(url)
      console.log(`[NightsBridge Debug] ${url} → ${status} (${contentType}) len=${body.length}`)

      sections.push(
        [
          sep,
          `URL:          ${url}`,
          `HTTP status:  ${status}`,
          `Content-Type: ${contentType}`,
          `Body length:  ${body.length} chars`,
          sep,
          // Show up to 60 KB of body — enough to see the structure without killing the browser
          body.slice(0, 60_000),
          body.length > 60_000 ? `\n…[truncated — ${body.length} total chars]` : "",
        ].join("\n"),
      )
    }

    return new NextResponse(sections.join("\n\n"), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    })
  }

  // ── Normal mode ─────────────────────────────────────────────────────────
  const result = await fetchNightsBridgeRates(bbid, arrive, depart)

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=120",
    },
  })
}
