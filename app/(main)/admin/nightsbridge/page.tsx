import type { Metadata } from "next"
import { NbAuditDashboard } from "@/components/admin/nb-audit-dashboard"
import { buildNightsBridgeAudit } from "@/lib/nightsbridge-audit"

export const metadata: Metadata = {
  title: "NightsBridge Data Audit | Boga Legaba",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<{ key?: string }>
}

export default async function NightsBridgeAuditPage({ searchParams }: PageProps) {
  const { key } = await searchParams
  const auditKey = process.env.NB_AUDIT_KEY
  const isDev = process.env.NODE_ENV === "development"
  const authorized = isDev || (auditKey && key === auditKey)

  if (!authorized) {
    return (
      <main className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-2xl">NightsBridge audit</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Add <code className="text-xs">?key=YOUR_NB_AUDIT_KEY</code> or set{" "}
          <code className="text-xs">NB_AUDIT_KEY</code> in the environment.
        </p>
      </main>
    )
  }

  let report
  let error: string | null = null
  try {
    report = await buildNightsBridgeAudit()
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to build audit"
  }

  return (
    <main className="bg-background py-10 lg:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold">Admin / Debug</p>
          <h1 className="mt-2 font-display text-3xl text-foreground sm:text-4xl">NightsBridge data audit</h1>
          <p className="mt-2 max-w-3xl font-body text-sm text-muted-foreground">
            Complete view of data fetched from NightsBridge, stored in Supabase, and shown on the website.
            JSON API: <code className="text-xs">/api/nightsbridge/audit</code>
          </p>
        </div>
        {error ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </p>
        ) : report ? (
          <NbAuditDashboard report={report} />
        ) : null}
      </div>
    </main>
  )
}
