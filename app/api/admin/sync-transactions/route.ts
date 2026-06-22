import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { execFile } from "child_process"
import path from "path"
import { cookies } from "next/headers"

const ADMIN_SESSION_COOKIE = "bl_admin_session"
const SYNC_DIR = path.join(process.cwd(), "services", "nightsbridge-sync")
const PYTHON = path.join(SYNC_DIR, ".venv", "bin", "python")
const SCRIPT = path.join(SYNC_DIR, "get_transactions.py")

export const dynamic = "force-dynamic"
export const maxDuration = 120 // 2 minutes

async function checkAuth() {
  const store = await cookies()
  const session = store.get(ADMIN_SESSION_COOKIE)?.value
  return session === process.env.ADMIN_SECRET
}

export async function POST(req: NextRequest) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return new Promise<NextResponse>((resolve) => {
    const env = {
      ...process.env,
      HEADLESS: "true",
      PYTHONUNBUFFERED: "1",
    }

    execFile(
      PYTHON,
      [SCRIPT],
      { cwd: SYNC_DIR, env, timeout: 110_000 },
      (error, stdout, stderr) => {
        const output = stdout + stderr
        if (error) {
          console.error("[sync-transactions] script error:", error.message)
          resolve(
            NextResponse.json(
              { success: false, error: error.message, output: output.slice(-2000) },
              { status: 500 },
            ),
          )
          return
        }
        const lines = output.trim().split("\n")
        const summary = lines.slice(-10).join("\n")
        resolve(NextResponse.json({ success: true, summary, output: output.slice(-3000) }))
      },
    )
  })
}
