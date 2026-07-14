"use client"

import { useState } from "react"
import { RefreshCw, Loader2, AlertTriangle, Star } from "lucide-react"

type SyncResult = {
  ok: true
  fetched: number
  inserted: number
  updated: number
  eligible: number
  threshold: number
  homepageShowsLive: boolean
}

type SyncError = { ok: false; error: string; detail?: string }

/**
 * Admin-only control that triggers the (otherwise dormant) Google review sync
 * on demand. Posts to /api/admin/reviews-sync, which is protected by the admin
 * session cookie and forwards to /api/reviews/sync with the CRON_SECRET
 * server-side — the secret is never exposed to this component.
 */
export function RefreshReviewsButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/admin/reviews-sync", { method: "POST" })
      const data = (await res.json().catch(() => ({}))) as SyncResult | SyncError
      if (!res.ok || !data.ok) {
        const e = data as SyncError
        setError(e.detail ? `${e.error} — ${e.detail}` : e.error || `Request failed (${res.status})`)
      } else {
        setResult(data)
      }
    } catch {
      setError("Network error — please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-[#996948] px-4 py-2.5 font-mono text-[12px] font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        {loading ? "Refreshing…" : "Refresh Reviews from Google"}
      </button>

      <p className="mt-3 max-w-xl font-mono text-[11px] leading-relaxed text-gray-400">
        Google only provides up to 5 reviews via this method — this reflects their current top reviews, not a
        random sample.
      </p>

      {/* Result summary */}
      {result && (
        <div className="mt-5 max-w-xl rounded-lg border border-gray-200 bg-white p-4">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-gray-400">Last sync result</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Fetched" value={result.fetched} />
            <Stat label="New saved" value={result.inserted} />
            <Stat label="Updated" value={result.updated} />
            <Stat label="Pass ≥3★" value={result.eligible} accent />
          </div>

          <div
            className={`mt-4 flex items-start gap-2 rounded-md border p-3 ${
              result.homepageShowsLive
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            <Star className="mt-0.5 size-3.5 shrink-0" />
            <p className="font-mono text-[11px] leading-relaxed">
              {result.homepageShowsLive ? (
                <>
                  <strong>{result.eligible}</strong> live reviews clear the 3-star filter — the homepage will now
                  show these live reviews.
                </>
              ) : (
                <>
                  Only <strong>{result.eligible}</strong> live review{result.eligible === 1 ? "" : "s"} clear the
                  3-star filter (need {result.threshold}+). The homepage keeps showing the curated reviews, so it
                  stays full instead of looking sparse.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-5 flex max-w-xl items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p className="font-mono text-[11px] leading-relaxed">{error}</p>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-center">
      <p className={`font-serif text-2xl font-bold ${accent ? "text-[#996948]" : "text-gray-900"}`}>{value}</p>
      <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-gray-400">{label}</p>
    </div>
  )
}
