import { NextRequest, NextResponse } from "next/server"
import { buildNightsBridgeAudit } from "@/lib/nightsbridge-audit"

export const dynamic = "force-dynamic"

/**
 * GET /api/nightsbridge/audit
 * Full NightsBridge data audit. Protected by NB_AUDIT_KEY query param or service role bearer.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const key = searchParams.get("key")
  const auth = request.headers.get("authorization")
  const auditKey = process.env.NB_AUDIT_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const authorized =
    (auditKey && key === auditKey) ||
    (serviceKey && auth === `Bearer ${serviceKey}`) ||
    process.env.NODE_ENV === "development"

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized — set ?key=NB_AUDIT_KEY" }, { status: 401 })
  }

  try {
    const report = await buildNightsBridgeAudit()
    return NextResponse.json(report)
  } catch (err) {
    console.error("[api/nightsbridge/audit]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Audit failed" },
      { status: 500 },
    )
  }
}
