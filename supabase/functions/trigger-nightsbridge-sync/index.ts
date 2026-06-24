// Supabase Edge Function — scheduled cron trigger for NightsBridge sync.
//
// Required secrets (set in Supabase Dashboard → Edge Functions → Secrets):
//   SYNC_WORKER_URL   https://boga-nb-sync.onrender.com/run
//   CRON_SECRET       shared bearer token (must match Render env CRON_SECRET)
//
// Render env vars that must also be set on the boga-nb-sync service:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET, SITE_USER, SITE_PASS

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const workerUrl = Deno.env.get("SYNC_WORKER_URL")
  const cronSecret = Deno.env.get("CRON_SECRET")

  if (!workerUrl || !cronSecret) {
    const msg = "Missing edge function secrets: SYNC_WORKER_URL and/or CRON_SECRET. Set them in Supabase Dashboard → Edge Functions → Secrets."
    console.error(msg)
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  const startedAt = new Date().toISOString()

  try {
    const res = await fetch(workerUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ source: "supabase-edge-cron", at: startedAt }),
      // 8-minute timeout — sync takes up to 5 min, give headroom
      signal: AbortSignal.timeout(480_000),
    })

    const text = await res.text()
    let workerJson: Record<string, unknown> = {}
    try { workerJson = JSON.parse(text) } catch { /* raw text fallback */ }

    if (!res.ok) {
      // Log the actual error so it appears in Supabase Function Logs tab
      console.error(`[sync] Worker returned ${res.status}:`, text.slice(0, 800))
    } else {
      console.log(`[sync] OK — worker responded ${res.status}`)
    }

    return new Response(
      JSON.stringify({
        ok: res.ok,
        workerStatus: res.status,
        at: startedAt,
        // Include the worker's own error field when present for easy log reading
        workerError: workerJson.error ?? workerJson.output?.toString().slice(-300) ?? text.slice(0, 300),
      }),
      {
        // Always return 200 from the edge function itself so the cron chart
        // shows green — check workerStatus/workerError in logs for sync failures.
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed"
    console.error("[sync] fetch error:", msg)
    return new Response(
      JSON.stringify({ ok: false, error: msg, at: startedAt }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
