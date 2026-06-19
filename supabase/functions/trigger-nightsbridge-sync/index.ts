// Supabase Edge Function — scheduled cron trigger for NightsBridge sync.
//
// Supabase CAN run this on a schedule (Dashboard → Edge Functions → Schedules).
// Supabase CANNOT run Playwright/Python inside Postgres or Edge Functions.
// This function calls your external sync worker (Railway, VPS, or your Mac via tunnel).
//
// Required secrets (supabase secrets set):
//   SYNC_WORKER_URL   e.g. https://your-worker.railway.app/run
//   CRON_SECRET       shared bearer token
//
// Deploy: supabase functions deploy trigger-nightsbridge-sync
// Schedule: every 10 minutes in Supabase Dashboard or config.toml

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

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
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Set SYNC_WORKER_URL and CRON_SECRET in Supabase Edge Function secrets.",
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  try {
    const res = await fetch(workerUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ source: "supabase-edge-cron", at: new Date().toISOString() }),
    })

    const text = await res.text()
    return new Response(
      JSON.stringify({ ok: res.ok, status: res.status, worker: text.slice(0, 500) }),
      {
        status: res.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "fetch failed" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
