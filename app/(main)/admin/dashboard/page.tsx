import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import {
  Building2,
  BedDouble,
  Users,
  TrendingUp,
  Calendar,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Star,
  Wifi,
  Car,
  Clock,
  ChevronRight,
  Database,
  Zap,
  Globe,
  BarChart3,
  Shield,
  CreditCard,
  ArrowUpRight,
} from "lucide-react"
import {
  fetchEstablishment,
  fetchOccupancyCalendar,
  fetchSpecials,
  type OccupancyDay,
} from "@/lib/nightsbridge-api"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { AdminSignOutButton } from "@/components/admin/sign-out-button"
import { SyncTransactionsButton } from "@/components/admin/sync-transactions-button"

export const metadata: Metadata = {
  title: "Admin Dashboard | Boga Legaba",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

const NB_BBID = 21091

// ---------------------------------------------------------------------------
// Auth guard (belt-and-suspenders — middleware already blocks, but good practice)
// ---------------------------------------------------------------------------

async function isAuthenticated() {
  const store = await cookies()
  const session = store.get("bl_admin_session")?.value
  return session === process.env.ADMIN_SECRET
}

// ---------------------------------------------------------------------------
// Supabase stats helpers
// ---------------------------------------------------------------------------

async function fetchSupabaseStats() {
  try {
    const sb = createSupabaseAdminClient()

    const [roomsRes, rateCacheRes, availCacheRes, txnRes] = await Promise.all([
      sb.from("room").select("bbroomid, room_name, property_name, is_active", { count: "exact" }),
      sb
        .from("rate_cache")
        .select("rtname, rate_single, rate_double, arrive, depart, scraped_at", { count: "exact" })
        .order("scraped_at", { ascending: false })
        .limit(20),
      sb
        .from("availability_cache")
        .select("bbroomid, check_date, is_available, rate", { count: "exact" })
        .order("check_date", { ascending: false })
        .limit(50),
      sb
        .from("transactions")
        .select(
          "pay_id, txn_date, gateway, booking_ref, guest_name, arriving, amount, status_code, status_text, success",
          { count: "exact" },
        )
        .order("pay_id", { ascending: false })
        .limit(30),
    ])

    return {
      rooms: roomsRes.data ?? [],
      roomCount: roomsRes.count ?? 0,
      rateCache: rateCacheRes.data ?? [],
      rateCacheCount: rateCacheRes.count ?? 0,
      availCache: availCacheRes.data ?? [],
      availCacheCount: availCacheRes.count ?? 0,
      transactions: txnRes.data ?? [],
      transactionCount: txnRes.count ?? 0,
    }
  } catch {
    return {
      rooms: [],
      roomCount: 0,
      rateCache: [],
      rateCacheCount: 0,
      availCache: [],
      availCacheCount: 0,
      transactions: [],
      transactionCount: 0,
    }
  }
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function fmt(n: number) {
  return `R\u202F${Math.round(n).toLocaleString("en-ZA")}`
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${iso}T12:00:00`))
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function daysAhead(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Occupancy calendar grid
// ---------------------------------------------------------------------------

function OccupancyGrid({ days }: { days: OccupancyDay[] }) {
  const show = days.slice(0, 30)
  return (
    <div className="grid grid-cols-7 gap-1 sm:grid-cols-10 lg:grid-cols-15">
      {show.map((d) => {
        const pct = d.total > 0 ? d.available / d.total : 0
        const bg =
          pct === 0
            ? "bg-red-100 border-red-200"
            : pct < 0.5
              ? "bg-amber-50 border-amber-200"
              : "bg-emerald-50 border-emerald-200"
        const text =
          pct === 0 ? "text-red-700" : pct < 0.5 ? "text-amber-700" : "text-emerald-700"
        return (
          <div
            key={d.date}
            className={`rounded-lg border p-1.5 text-center ${bg}`}
            title={`${d.date}: ${d.available}/${d.total} room types available`}
          >
            <p className="font-mono text-[9px] font-bold text-gray-500">
              {new Date(`${d.date}T12:00:00`).getDate()}
            </p>
            <p className={`font-mono text-[9px] font-semibold ${text}`}>
              {d.available}/{d.total}
            </p>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-wider text-gray-400">{label}</p>
        <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
        {sub ? <p className="text-xs text-gray-500">{sub}</p> : null}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminDashboardPage() {
  if (!(await isAuthenticated())) redirect("/admin/login")

  const [estData, occupancy, specials, sbStats] = await Promise.all([
    fetchEstablishment(NB_BBID),
    fetchOccupancyCalendar(NB_BBID, 30),
    fetchSpecials(NB_BBID),
    fetchSupabaseStats(),
  ])

  const todayOccupancy = occupancy[0]
  const availableToday = todayOccupancy?.available ?? 0
  const totalToday = todayOccupancy?.total ?? 0

  const roomTypesWithImages = estData
    ? [...estData.roomTypes.values()].filter((rt) => rt.images.length > 0)
    : []

  const NB_DASHBOARD = "https://www.nightsbridge.com/dashboard/home"
  const NB_TRANSACTIONS = "https://www.nightsbridge.com/dashboard/payments/transactions"
  const NB_CALENDAR = `https://calendar.nightsbridge.com/?bbid=${NB_BBID}`
  const NB_BOOKING = `https://book.nightsbridge.com/${NB_BBID}`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top bar ──────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0a0a] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#b8973a]/20">
              <Shield className="size-4 text-[#b8973a]" />
            </div>
            <div>
              <span className="font-serif text-base font-bold text-white">Admin Dashboard</span>
              <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-white/40">
                Boga Legaba
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={NB_DASHBOARD}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[11px] text-white/70 hover:text-white transition-colors"
            >
              <Globe className="size-3.5" />
              NightsBridge
              <ExternalLink className="size-3" />
            </a>
            <AdminSignOutButton />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">

        {/* ── Section 1: Summary stats ──────────────────────── */}
        <div>
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-gray-400">
            Overview · Live from NightsBridge
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
            <StatCard
              label="Room types"
              value={estData?.roomTypes.size ?? "—"}
              sub="From NightsBridge"
              icon={BedDouble}
              color="bg-[#b8973a]/10 text-[#b8973a]"
            />
            <StatCard
              label="Available today"
              value={`${availableToday} / ${totalToday}`}
              sub={today()}
              icon={CheckCircle2}
              color="bg-emerald-50 text-emerald-600"
            />
            <StatCard
              label="Supabase rooms"
              value={sbStats.roomCount}
              sub="Physical rooms synced"
              icon={Database}
              color="bg-blue-50 text-blue-600"
            />
            <StatCard
              label="Transactions"
              value={sbStats.transactionCount ?? 0}
              sub="Scraped this month"
              icon={CreditCard}
              color="bg-purple-50 text-purple-600"
            />
          </div>
        </div>

        {/* ── Section 2: Property overview ──────────────────── */}
        {estData ? (
          <div>
            <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-gray-400">
              Property · {estData.name}
            </h2>
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Quick facts */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-gray-500">
                  Quick facts
                </h3>
                <div className="space-y-2.5">
                  {estData.checkintime ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="size-4 text-[#b8973a] shrink-0" />
                      <span className="text-gray-500">Check-in:</span>
                      <span className="font-medium text-gray-800">{estData.checkintime}</span>
                    </div>
                  ) : null}
                  {estData.checkouttime ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="size-4 text-[#b8973a] shrink-0" />
                      <span className="text-gray-500">Check-out:</span>
                      <span className="font-medium text-gray-800">{estData.checkouttime}</span>
                    </div>
                  ) : null}
                  {estData.wifi ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Wifi className="size-4 text-[#b8973a] shrink-0" />
                      <span className="text-gray-500">Wi-Fi:</span>
                      <span className="font-medium text-gray-800">{estData.wificost ?? estData.wifi}</span>
                    </div>
                  ) : null}
                  {estData.parking ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Car className="size-4 text-[#b8973a] shrink-0" />
                      <span className="text-gray-500">Parking:</span>
                      <span className="font-medium text-gray-800">{estData.parking}</span>
                    </div>
                  ) : null}
                  {estData.grading.length > 0 ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Star className="size-4 text-[#b8973a] shrink-0" />
                      <span className="font-medium text-gray-800">
                        {estData.grading[0].grade} · {estData.grading[0].gradingauthority}
                      </span>
                    </div>
                  ) : null}
                </div>

                {/* Amenities */}
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-gray-400">
                    Facilities
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {estData.propertyAmenities.map((a) => (
                      <span
                        key={a.code}
                        className="rounded-full bg-gray-100 px-2.5 py-1 font-mono text-[10px] text-gray-600"
                      >
                        {a.description}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Room type list */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-gray-500">
                  Room types ({estData.roomTypes.size})
                </h3>
                <div className="space-y-2">
                  {[...estData.roomTypes.values()].map((rt) => {
                    const today = todayOccupancy?.rooms.find((r) => r.rtid === rt.rtid)
                    return (
                      <div
                        key={rt.rtid}
                        className="flex items-center gap-3 rounded-lg border border-gray-100 p-2.5"
                      >
                        {rt.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={rt.images[0].small}
                            alt={rt.name}
                            className="h-10 w-14 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <div className="h-10 w-14 shrink-0 rounded bg-gray-100 flex items-center justify-center">
                            <BedDouble className="size-4 text-gray-300" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-800">{rt.name}</p>
                          <div className="flex items-center gap-2">
                            {rt.roomSizeM2 ? (
                              <span className="font-mono text-[10px] text-gray-400">
                                {rt.roomSizeM2}m²
                              </span>
                            ) : null}
                            {rt.quality ? (
                              <span className="font-mono text-[10px] text-gray-400">
                                {rt.quality}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        {today ? (
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase ${
                              today.available
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-600"
                            }`}
                          >
                            {today.available ? "Avail" : "Sold"}
                          </span>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Property gallery */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-gray-500">
                  Property images
                </h3>
                <div className="space-y-2">
                  {estData.propertyImages.map((img, i) => (
                    <div key={i} className="overflow-hidden rounded-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.medium}
                        alt={img.categoryname}
                        className="h-28 w-full object-cover"
                      />
                      <p className="bg-gray-50 px-2 py-1 font-mono text-[9px] text-gray-400">
                        {img.categoryname}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 border-t border-gray-100 pt-3">
                  <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-gray-500">
                    Room type images
                  </h3>
                  <div className="grid grid-cols-4 gap-1">
                    {roomTypesWithImages.slice(0, 8).map((rt) => (
                      <div key={rt.rtid} className="relative overflow-hidden rounded">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={rt.images[0].small}
                          alt={rt.name}
                          className="h-12 w-full object-cover"
                          title={rt.name}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* ── Section 3: 30-day occupancy calendar ──────────── */}
        {occupancy.length > 0 ? (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-400">
                Occupancy calendar · next 30 days
              </h2>
              <div className="flex items-center gap-3 font-mono text-[10px] text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded bg-emerald-200 border border-emerald-300" />
                  Available
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded bg-amber-100 border border-amber-200" />
                  Partial
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded bg-red-100 border border-red-200" />
                  Full
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 text-xs text-gray-500">
                Each cell shows <strong>available / total</strong> room types for that date.
              </div>
              <OccupancyGrid days={occupancy} />
            </div>
          </div>
        ) : null}

        {/* ── Section 4: Specials ───────────────────────────── */}
        {specials.length > 0 ? (
          <div>
            <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-gray-400">
              Active specials ({specials.length})
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {specials.map((s) => (
                <div
                  key={s.specialid}
                  className="rounded-xl border border-[#b8973a]/20 bg-white p-4 shadow-sm"
                >
                  <p className="font-semibold text-gray-900">{s.title}</p>
                  {s.description ? (
                    <p className="mt-1 text-sm text-gray-600">{s.description}</p>
                  ) : null}
                  {s.validfrom && s.validto ? (
                    <p className="mt-2 font-mono text-[10px] text-gray-400">
                      {fmtDate(s.validfrom)} → {fmtDate(s.validto)}
                    </p>
                  ) : null}
                  {s.discount ? (
                    <span className="mt-2 inline-block rounded-full bg-[#b8973a]/10 px-2.5 py-0.5 font-mono text-[11px] text-[#b8973a]">
                      {s.discount}% off
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-5">
            <p className="font-mono text-[11px] text-gray-400 text-center uppercase tracking-wider">
              No active specials on NightsBridge
            </p>
          </div>
        )}

        {/* ── Section 5: Supabase data ──────────────────────── */}
        <div>
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-gray-400">
            Supabase database
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Rooms */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                <p className="font-mono text-[11px] uppercase tracking-wider text-gray-500">
                  Synced rooms ({sbStats.roomCount})
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {sbStats.rooms.slice(0, 15).map((r: { bbroomid: number; room_name: string; property_name: string | null; is_active: boolean }) => (
                  <div key={r.bbroomid} className="flex items-center justify-between px-4 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{r.room_name}</p>
                      <p className="font-mono text-[10px] text-gray-400">{r.property_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-gray-400">#{r.bbroomid}</span>
                      {r.is_active ? (
                        <span className="size-2 rounded-full bg-emerald-500" />
                      ) : (
                        <span className="size-2 rounded-full bg-gray-300" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rate cache */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                <p className="font-mono text-[11px] uppercase tracking-wider text-gray-500">
                  Rate cache — latest 20 rows ({sbStats.rateCacheCount} total)
                </p>
              </div>
              {sbStats.rateCache.length === 0 ? (
                <div className="px-4 py-6 text-center font-mono text-[11px] text-gray-400">
                  No cached rates yet — they get written automatically on booking page visits
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[400px] text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="px-4 py-2 text-left font-mono text-[10px] text-gray-400">Room type</th>
                        <th className="px-3 py-2 text-right font-mono text-[10px] text-gray-400">1 adult</th>
                        <th className="px-3 py-2 text-right font-mono text-[10px] text-gray-400">2 adults</th>
                        <th className="px-3 py-2 text-left font-mono text-[10px] text-gray-400">Stay</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sbStats.rateCache.map(
                        (r: { rtname: string; rate_single: string | null; rate_double: string | null; arrive: string; depart: string }, i: number) => (
                          <tr key={i} className="hover:bg-gray-50/60">
                            <td className="px-4 py-2 font-medium text-gray-800">{r.rtname}</td>
                            <td className="px-3 py-2 text-right text-[#b8973a]">
                              {r.rate_single ? fmt(Number(r.rate_single)) : "—"}
                            </td>
                            <td className="px-3 py-2 text-right text-[#b8973a]">
                              {r.rate_double ? fmt(Number(r.rate_double)) : "—"}
                            </td>
                            <td className="px-3 py-2 font-mono text-[10px] text-gray-400">
                              {r.arrive} → {r.depart}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 6: Payment Transactions ──────────────── */}
        <div>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-400">
              Payment transactions · {sbStats.transactionCount ?? 0} scraped
            </h2>
            <SyncTransactionsButton />
          </div>

          {sbStats.transactions && sbStats.transactions.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              {/* Revenue summary */}
              <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50">
                {(() => {
                  const paid = (sbStats.transactions ?? []).filter(
                    (t: { status_code: string }) => t.status_code === "P",
                  )
                  const pending = (sbStats.transactions ?? []).filter(
                    (t: { status_code: string }) => t.status_code === "W",
                  )
                  const totalPaid = paid.reduce(
                    (s: number, t: { amount: number | null }) => s + (t.amount ?? 0),
                    0,
                  )
                  const totalPending = pending.reduce(
                    (s: number, t: { amount: number | null }) => s + (t.amount ?? 0),
                    0,
                  )
                  return (
                    <>
                      <div className="px-5 py-3 text-center">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-gray-400">
                          Paid
                        </p>
                        <p className="text-lg font-bold text-emerald-600">{fmt(totalPaid)}</p>
                        <p className="font-mono text-[10px] text-gray-400">{paid.length} txns</p>
                      </div>
                      <div className="px-5 py-3 text-center">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-gray-400">
                          Pending auth
                        </p>
                        <p className="text-lg font-bold text-amber-600">{fmt(totalPending)}</p>
                        <p className="font-mono text-[10px] text-gray-400">{pending.length} txns</p>
                      </div>
                      <div className="px-5 py-3 text-center">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-gray-400">
                          Total
                        </p>
                        <p className="text-lg font-bold text-[#b8973a]">
                          {fmt(totalPaid + totalPending)}
                        </p>
                        <p className="font-mono text-[10px] text-gray-400">
                          {(sbStats.transactions ?? []).length} txns
                        </p>
                      </div>
                    </>
                  )
                })()}
              </div>

              {/* Transactions table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-gray-400">
                        Pay ID
                      </th>
                      <th className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-gray-400">
                        Date
                      </th>
                      <th className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-gray-400">
                        Guest
                      </th>
                      <th className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-gray-400">
                        Booking
                      </th>
                      <th className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-gray-400">
                        Gateway
                      </th>
                      <th className="px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-wider text-gray-400">
                        Amount
                      </th>
                      <th className="px-3 py-2.5 text-center font-mono text-[10px] uppercase tracking-wider text-gray-400">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(sbStats.transactions ?? []).map(
                      (t: {
                        pay_id: number
                        txn_date: string | null
                        guest_name: string | null
                        booking_ref: string | null
                        arriving: string | null
                        gateway: string | null
                        amount: number | null
                        status_code: string | null
                        status_text: string | null
                        success: boolean
                      }) => (
                        <tr key={t.pay_id} className="hover:bg-gray-50/60">
                          <td className="px-4 py-2.5 font-mono text-gray-400">{t.pay_id}</td>
                          <td className="px-3 py-2.5 text-gray-600">
                            {t.txn_date?.replace(" • ", " ") ?? "—"}
                          </td>
                          <td className="px-3 py-2.5 font-medium text-gray-800">
                            {t.guest_name ?? "—"}
                          </td>
                          <td className="px-3 py-2.5">
                            {t.booking_ref ? (
                              <a
                                href={`https://www.nightsbridge.com/dashboard/booking/${t.booking_ref}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 font-mono text-blue-600 hover:text-blue-800"
                              >
                                #{t.booking_ref}
                                <ArrowUpRight className="size-3" />
                              </a>
                            ) : (
                              "—"
                            )}
                            {t.arriving ? (
                              <p className="mt-0.5 font-mono text-[10px] text-gray-400">
                                Arr: {t.arriving}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[10px] text-gray-500">
                              {t.gateway ?? "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-[#b8973a]">
                            {t.amount != null ? fmt(t.amount) : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
                                t.status_code === "P"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : t.status_code === "W"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-gray-50 text-gray-500"
                              }`}
                            >
                              {t.status_code === "P" ? "Paid" : t.status_code === "W" ? "Pending" : (t.status_code ?? "?")}
                            </span>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              {(sbStats.transactionCount ?? 0) > 30 ? (
                <div className="border-t border-gray-100 px-4 py-2.5 text-center font-mono text-[10px] text-gray-400">
                  Showing latest 30 of {sbStats.transactionCount} transactions · Run sync to refresh
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center">
              <CreditCard className="mx-auto mb-3 size-8 text-gray-300" />
              <p className="font-mono text-[11px] uppercase tracking-wider text-gray-400">
                No transactions scraped yet
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Click &quot;Sync from NightsBridge&quot; above to scrape the latest transactions.
              </p>
              <p className="mt-1 font-mono text-[10px] text-gray-400">
                Or run:{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5">
                  cd services/nightsbridge-sync && python get_transactions.py
                </code>
              </p>
            </div>
          )}
        </div>

        {/* ── Section 8: NightsBridge quick links ───────────── */}
        <div>
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-gray-400">
            NightsBridge quick access
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Dashboard",
                desc: "Property management home",
                href: NB_DASHBOARD,
                icon: Building2,
                color: "bg-blue-600",
              },
              {
                label: "Transactions",
                desc: "Payment history & reports",
                href: NB_TRANSACTIONS,
                icon: TrendingUp,
                color: "bg-emerald-600",
              },
              {
                label: "Calendar",
                desc: "Availability calendar",
                href: NB_CALENDAR,
                icon: Calendar,
                color: "bg-purple-600",
              },
              {
                label: "Booking widget",
                desc: "Public booking page",
                href: NB_BOOKING,
                icon: Globe,
                color: "bg-[#b8973a]",
              },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.color}`}
                >
                  <item.icon className="size-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
                <ExternalLink className="ml-auto size-4 shrink-0 text-gray-300" />
              </a>
            ))}
          </div>

          {/* Credentials note */}
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3">
            <p className="text-sm text-amber-800">
              <strong>NightsBridge credentials:</strong> Username{" "}
              <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">
                {process.env.SITE_USER ?? "21091"}
              </code>{" "}
              · Password{" "}
              <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">
                {process.env.SITE_PASS ?? "4609"}
              </code>{" "}
              — use these to log in to the NightsBridge links above.
            </p>
          </div>
        </div>

        {/* ── Section 9: Availability detail for next 7 days ── */}
        {occupancy.slice(0, 7).length > 0 ? (
          <div>
            <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-gray-400">
              Detailed availability · next 7 days
            </h2>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-wider text-gray-500">
                        Date
                      </th>
                      {occupancy[0]?.rooms.map((r) => (
                        <th
                          key={r.rtid}
                          className="px-3 py-3 text-center font-mono text-[11px] uppercase tracking-wider text-gray-500"
                        >
                          {r.rtname.replace(/\s*\(.*\)/, "").trim()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {occupancy.slice(0, 7).map((day) => (
                      <tr key={day.date} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">
                            {new Intl.DateTimeFormat("en-GB", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            }).format(new Date(`${day.date}T12:00:00`))}
                          </p>
                        </td>
                        {day.rooms.map((r) => (
                          <td key={r.rtid} className="px-3 py-3 text-center">
                            {r.available ? (
                              <div>
                                <CheckCircle2 className="mx-auto size-4 text-emerald-500" />
                                {r.rateSingle ? (
                                  <p className="mt-0.5 font-mono text-[10px] text-[#b8973a]">
                                    {fmt(r.rateSingle)}
                                  </p>
                                ) : null}
                              </div>
                            ) : (
                              <XCircle className="mx-auto size-4 text-red-400" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {/* ── Footer ───────────────────────────────────────── */}
        <div className="border-t border-gray-200 pb-8 pt-4 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-300">
            Boga Legaba Admin · Last updated: {new Date().toLocaleTimeString("en-ZA")} ·{" "}
            <a href="/admin/dashboard" className="hover:text-gray-500 transition-colors">
              Refresh
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
