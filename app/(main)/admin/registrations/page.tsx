import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { listRegistrations } from "@/lib/guest-registration"

export const metadata: Metadata = {
  title: "Guest Registrations | Boga Legaba Admin",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

async function isAuthenticated() {
  const store = await cookies()
  return store.get("bl_admin_session")?.value === process.env.ADMIN_SECRET
}

function fmt(iso: string) {
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    .format(new Date(iso))
}

export default async function RegistrationsPage() {
  if (!(await isAuthenticated())) redirect("/admin/login")
  const rows = await listRegistrations(200)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0a0a] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <Link href="/admin/dashboard" className="flex items-center gap-1 font-mono text-[11px] text-white/60 hover:text-white">
            <ChevronLeft className="size-3.5" /> Dashboard
          </Link>
          <span className="font-serif text-base font-bold text-white">Guest Registrations</span>
          <span className="ml-auto font-mono text-[11px] text-white/40">{rows.length} on file</span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
            No registrations yet. Guests submit them at{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5">/register</code>
            {" "}(or <code className="rounded bg-gray-100 px-1 py-0.5">/register?ref=BOOKINGREF</code>).
            <p className="mt-2 text-xs text-gray-400">If this stays empty after submissions, confirm migration 010 has been applied.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[900px] text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left font-mono text-[10px] uppercase tracking-wider text-gray-400">
                  <th className="px-3 py-2.5">Submitted</th>
                  <th className="px-3 py-2.5">Name</th>
                  <th className="px-3 py-2.5">Contact</th>
                  <th className="px-3 py-2.5">Ref</th>
                  <th className="px-3 py-2.5">Nationality</th>
                  <th className="px-3 py-2.5">ID / Passport</th>
                  <th className="px-3 py-2.5">Vehicle</th>
                  <th className="px-3 py-2.5">Guests</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60">
                    <td className="px-3 py-2.5 text-gray-400">{fmt(r.submitted_at)}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-800">{r.full_name}</td>
                    <td className="px-3 py-2.5 text-gray-600">
                      {r.email && <div>{r.email}</div>}
                      {r.phone && <div className="text-gray-400">{r.phone}</div>}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-gray-500">{r.booking_ref ?? "—"}</td>
                    <td className="px-3 py-2.5 text-gray-600">{r.nationality ?? "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-gray-600">{r.id_or_passport ?? "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-gray-600">{r.vehicle_reg ?? "—"}</td>
                    <td className="px-3 py-2.5 text-gray-600">{r.num_guests ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
