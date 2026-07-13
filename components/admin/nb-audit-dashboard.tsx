"use client"

import { useMemo, useState } from "react"
import type { NbAuditReport } from "@/lib/nightsbridge-audit"
import { cn } from "@/lib/utils"

type Props = { report: NbAuditReport }

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left font-mono text-xs uppercase tracking-[0.14em] text-gold"
      >
        {title}
        <span className="text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open ? <div className="border-t border-border px-5 py-4">{children}</div> : null}
    </section>
  )
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-96 overflow-auto rounded-lg bg-[#000000] p-4 font-mono text-[11px] leading-relaxed text-emerald-200/90">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl text-foreground">{value}</p>
    </div>
  )
}

export function NbAuditDashboard({ report }: Props) {
  const [roomFilter, setRoomFilter] = useState("")

  const filteredRooms = useMemo(() => {
    const q = roomFilter.trim().toLowerCase()
    if (!q) return report.rooms
    return report.rooms.filter(
      (r) =>
        r.room_name.toLowerCase().includes(q) ||
        (r.property_name ?? "").toLowerCase().includes(q),
    )
  }, [report.rooms, roomFilter])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gold/30 bg-gold/5 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold">NightsBridge data audit</p>
        <p className="mt-2 font-body text-sm text-muted-foreground">
          Generated {new Date(report.generatedAt).toLocaleString("en-ZA")} · Sync cron: {report.syncSchedule}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Rooms" value={report.counts.rooms} />
        <Stat label="Room types" value={report.counts.roomTypes} />
        <Stat label="Availability rows" value={report.counts.availabilityRows} />
        <Stat label="Media assets" value={report.counts.mediaAssets} />
        <Stat label="Bookings" value={report.counts.bookings} />
        <Stat label="Closeouts" value={report.counts.closeouts} />
        <Stat label="Calendar events" value={report.counts.calendarEvents} />
        <Stat label="Properties" value={report.counts.properties} />
      </div>

      <Section title="Data flow">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 font-body text-sm font-medium">Fetched from NightsBridge</h3>
            <ul className="list-disc space-y-1 pl-5 font-body text-sm text-muted-foreground">
              {report.dataFlow.fetched.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 font-body text-sm font-medium">Not available from API</h3>
            <ul className="list-disc space-y-1 pl-5 font-body text-sm text-amber-800 dark:text-amber-200">
              {report.dataFlow.notAvailableFromNb.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 font-body text-sm font-medium">Stored in database</h3>
            <p className="font-mono text-xs text-muted-foreground">{report.dataFlow.storedInDb.join(", ")}</p>
          </div>
          <div>
            <h3 className="mb-2 font-body text-sm font-medium">Displayed from database (not live API)</h3>
            <p className="font-mono text-xs text-muted-foreground">{report.dataFlow.displayedFromDb.join(", ")}</p>
          </div>
        </div>
      </Section>

      <Section title="Coverage gaps">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Rooms → room type" value={report.coverage.roomsLinkedToRoomType} />
          <Stat label="Rooms with description" value={report.coverage.roomsWithDescription} />
          <Stat label="Rooms with media" value={report.coverage.roomsWithMedia} />
        </div>
        {report.coverage.roomsMissingType.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 font-body text-sm font-medium text-amber-800">Rooms missing room_type link</p>
            <JsonBlock value={report.coverage.roomsMissingType} />
          </div>
        ) : null}
      </Section>

      <Section title="API field inventory" defaultOpen={false}>
        <JsonBlock value={report.inventory} />
      </Section>

      <Section title="Properties" defaultOpen={false}>
        <JsonBlock value={report.properties} />
      </Section>

      <Section title="Room types" defaultOpen={false}>
        <JsonBlock value={report.roomTypes} />
      </Section>

      <Section title={`Rooms (${filteredRooms.length})`}>
        <input
          type="search"
          placeholder="Filter by room or property…"
          value={roomFilter}
          onChange={(e) => setRoomFilter(e.target.value)}
          className="mb-4 w-full max-w-md rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[720px] text-left font-mono text-[11px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Room</th>
                <th className="py-2 pr-3">Property</th>
                <th className="py-2 pr-3">Type ID</th>
                <th className="py-2 pr-3">Config</th>
                <th className="py-2 pr-3">Bath</th>
                <th className="py-2 pr-3">Media</th>
                <th className="py-2">Type / desc</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map((r) => {
                const rt = r.room_type as {
                  rtname?: string | null
                  rtdesc?: string | null
                  max_occupancy?: number | null
                } | null
                return (
                  <tr key={r.bbroomid} className="border-b border-border/60 align-top">
                    <td className="py-2 pr-3 text-taupe">{r.bbroomid}</td>
                    <td className="py-2 pr-3 font-medium text-foreground">{r.room_name}</td>
                    <td className="py-2 pr-3">{r.property_name}</td>
                    <td className="py-2 pr-3">{r.bbrtid ?? "—"}</td>
                    <td className="py-2 pr-3">{r.configuration}</td>
                    <td className="py-2 pr-3">{r.bathroom_type}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5",
                          r.hasMedia ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-600",
                        )}
                      >
                        {r.hasMedia ? "yes" : "no"}
                      </span>
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {rt?.rtname ?? "—"}
                      {rt?.max_occupancy ? ` · sleeps ${rt.max_occupancy}` : ""}
                      {rt?.rtdesc ? (
                        <span className="mt-1 block max-w-xs truncate text-[10px]">{rt.rtdesc}</span>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Media assets" defaultOpen={false}>
        {report.media.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground">
            No media_asset rows yet. Run <code className="text-xs">python images.py</code> in ScriptTestBLGH
            (scrapes Web Info image URLs from the NightsBridge webview).
          </p>
        ) : (
          <JsonBlock value={report.media} />
        )}
      </Section>

      <Section title="Availability sample" defaultOpen={false}>
        <JsonBlock value={report.availabilitySample} />
      </Section>

      <Section title="Latest API snapshot" defaultOpen={false}>
        {report.latestSnapshot ? (
          <JsonBlock value={report.latestSnapshot} />
        ) : (
          <p className="text-sm text-muted-foreground">No nb_api_snapshot rows — run sync after migration.</p>
        )}
      </Section>

      <Section title="Recent sync runs" defaultOpen={false}>
        <JsonBlock value={report.recentSyncRuns} />
      </Section>

      <Section title="Recommendations">
        <ul className="list-disc space-y-2 pl-5 font-body text-sm text-muted-foreground">
          {report.recommendations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
