import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 300

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get("authorization")
  return auth === `Bearer ${secret}`
}

/**
 * POST /api/sync — triggered by cron or manual POST with CRON_SECRET.
 *
 * Playwright runs on an external host. Set SYNC_WORKER_URL to a machine running
 * `public/ScriptTestBLGH/run-sync.sh`, or RUN_LOCAL_SYNC=true on a dev machine.
 */
export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const workerUrl = process.env.SYNC_WORKER_URL
  if (workerUrl) {
    try {
      const res = await fetch(workerUrl, {
        method: "POST",
        headers: {
          Authorization: request.headers.get("authorization") ?? "",
          "Content-Type": "application/json",
        },
      })
      const body = await res.text()
      return new NextResponse(body, { status: res.status, headers: { "Content-Type": "application/json" } })
    } catch (err) {
      console.error("[api/sync] worker fetch failed", err)
      return NextResponse.json({ error: "Sync worker unreachable" }, { status: 502 })
    }
  }

  if (process.env.RUN_LOCAL_SYNC === "true") {
    try {
      const { execFile } = await import("node:child_process")
      const { promisify } = await import("node:util")
      const execFileAsync = promisify(execFile)
      const syncDir = process.env.NIGHTSBRIDGE_SYNC_DIR ?? "public/ScriptTestBLGH"
      const pythonBin = process.env.PYTHON_BIN ?? "python3"
      const { stdout, stderr } = await execFileAsync(pythonBin, ["main.py"], {
        cwd: syncDir,
        timeout: 280_000,
        env: process.env,
      })
      return NextResponse.json({ ok: true, stdout, stderr })
    } catch (err) {
      console.error("[api/sync] local python failed", err)
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Local sync failed" },
        { status: 500 },
      )
    }
  }

  return NextResponse.json(
    {
      error: "Sync not configured",
      hint: "Set SYNC_WORKER_URL (external Python host) or RUN_LOCAL_SYNC=true.",
    },
    { status: 503 },
  )
}

export async function GET(request: NextRequest) {
  return POST(request)
}
