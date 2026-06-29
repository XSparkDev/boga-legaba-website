import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  Building2,
  BedDouble,
  Users,
  TrendingUp,
  Calendar,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
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
  CalendarDays,
} from "lucide-react"
import {
  fetchEstablishment,
  fetchOccupancyCalendar,
  fetchSpecials,
  type OccupancyDay,
} from "@/lib/nightsbridge-api"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { AdminSignOutButton } from "@/components/admin/sign-out-button"
import { AnalyticsCharts } from "@/components/admin/analytics-charts"

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

type OccBooking = { from_date: string; to_date: string; rooms: number }

async function fetchSupabaseStats() {
  // Real-booking occupancy window: today → +31 days
  const winStart = new Date().toISOString().slice(0, 10)
  const winEnd = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 31)
    return d.toISOString().slice(0, 10)
  })()

  try {
    const sb = createSupabaseAdminClient()

    const [roomsRes, rateCacheRes, availCacheRes, txnRes, bookingsRes] = await Promise.all([
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
      // Real bookings overlapping the next 31 days — used for actual room occupancy
      sb
        .from("booking")
        .select("from_date, to_date, raw")
        .eq("is_cancelled", false)
        .gte("to_date", winStart)
        .lte("from_date", winEnd)
        .limit(500),
    ])

    const bookings: OccBooking[] = (bookingsRes.data ?? []).map((b) => {
      const raw = (b.raw as Record<string, unknown>) ?? {}
      const rooms = raw.rooms as unknown[] | undefined
      return {
        from_date: b.from_date as string,
        to_date: b.to_date as string,
        rooms: Array.isArray(rooms) && rooms.length > 0 ? rooms.length : 1,
      }
    })

    return {
      rooms: roomsRes.data ?? [],
      roomCount: roomsRes.count ?? 0,
      rateCache: rateCacheRes.data ?? [],
      rateCacheCount: rateCacheRes.count ?? 0,
      availCache: availCacheRes.data ?? [],
      availCacheCount: availCacheRes.count ?? 0,
      transactions: txnRes.data ?? [],
      transactionCount: txnRes.count ?? 0,
      bookings,
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
      bookings: [] as OccBooking[],
    }
  }
}

// Build real per-day room occupancy from bookings (rooms booked vs total rooms)
function buildRoomOccupancy(
  bookings: OccBooking[],
  totalRooms: number,
  days = 30,
): Array<{ date: string; booked: number; available: number; total: number }> {
  const out = []
  const base = new Date()
  for (let i = 0; i < days; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    let booked = 0
    for (const b of bookings) {
      if (b.from_date <= iso && b.to_date > iso) booked += b.rooms
    }
    booked = Math.min(booked, totalRooms)
    out.push({ date: iso, booked, available: Math.max(0, totalRooms - booked), total: totalRooms })
  }
  return out
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
// Availability calendar — proper month-grid view (replaces the old flat grid)
// ---------------------------------------------------------------------------

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function AvailabilityCalendar({ days }: { days: OccupancyDay[] }) {
  if (days.length === 0) return null

  // Index occupancy by ISO date for quick lookup
  const byDate = new Map(days.map((d) => [d.date, d]))

  // Build a continuous run of dates from the first to the last day we have,
  // laid out in Monday-start weeks (leading blanks for alignment).
  const firstISO = days[0].date
  const lastISO = days[days.length - 1].date
  const start = new Date(`${firstISO}T12:00:00`)
  const end = new Date(`${lastISO}T12:00:00`)

  const cells: Array<{ iso: string; day: number; inRange: boolean } | null> = []
  const lead = (start.getDay() + 6) % 7 // Mon=0 … Sun=6
  for (let i = 0; i < lead; i++) cells.push(null)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10)
    cells.push({ iso, day: d.getDate(), inRange: true })
  }
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (typeof cells)[] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const monthSpan = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(start)
  const endMonth = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(end)
  const heading = monthSpan === endMonth ? monthSpan : `${monthSpan} – ${endMonth}`
  const todayISO = today()

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-serif text-lg font-semibold text-gray-900">{heading}</p>
        <div className="flex items-center gap-3 font-mono text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded bg-emerald-400" /> Available
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded bg-amber-300" /> Limited
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded bg-red-300" /> Full
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-center font-mono text-[10px] uppercase tracking-wider text-gray-400">
            {w}
          </div>
        ))}

        {weeks.flat().map((cell, i) => {
          if (!cell) return <div key={`b${i}`} className="aspect-square" />
          const occ = byDate.get(cell.iso)
          const total = occ?.total ?? 0
          const avail = occ?.available ?? 0
          const pct = total > 0 ? avail / total : 0
          const isToday = cell.iso === todayISO

          const tone =
            !occ
              ? { bg: "bg-gray-50 border-gray-100", dot: "bg-gray-200", txt: "text-gray-300" }
              : pct === 0
                ? { bg: "bg-red-50 border-red-100", dot: "bg-red-400", txt: "text-red-600" }
                : pct < 0.5
                  ? { bg: "bg-amber-50 border-amber-100", dot: "bg-amber-400", txt: "text-amber-700" }
                  : { bg: "bg-emerald-50 border-emerald-100", dot: "bg-emerald-500", txt: "text-emerald-700" }

          return (
            <div
              key={cell.iso}
              title={occ ? `${cell.iso}: ${avail} of ${total} rooms available` : cell.iso}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg border ${tone.bg} ${
                isToday ? "ring-2 ring-[#b8973a] ring-offset-1" : ""
              }`}
            >
              <span className="absolute left-1.5 top-1 font-mono text-[10px] font-semibold text-gray-500">
                {cell.day}
              </span>
              {occ ? (
                <>
                  <span className={`mt-2 inline-block h-2 w-2 rounded-full ${tone.dot}`} />
                  <span className={`mt-1 font-mono text-[11px] font-bold ${tone.txt}`}>
                    {avail}
                    <span className="font-normal text-gray-400">/{total}</span>
                  </span>
                </>
              ) : null}
            </div>
          )
        })}
      </div>
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

  // ── REAL room occupancy from the booking table (rooms booked vs 28 total) ──
  const totalRooms = sbStats.roomCount || 28
  const roomOccupancy = buildRoomOccupancy(sbStats.bookings, totalRooms, 30)
  const bookedToday = roomOccupancy[0]?.booked ?? 0
  const availableToday = roomOccupancy[0]?.available ?? totalRooms
  const totalToday = totalRooms

  const roomTypesWithImages = estData
    ? [...estData.roomTypes.values()].filter((rt) => rt.images.length > 0)
    : []

  // ── Analytics chart data (plain serialisable shapes for the client charts) ──
  const trendData = roomOccupancy.map((d) => ({
    date: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(
      new Date(`${d.date}T12:00:00`),
    ),
    booked: d.booked,
    available: d.available,
  }))

  // Rates per room type — latest cached rate wins (rateCache is ordered newest first)
  const rateByName = new Map<string, { single: number | null; double: number | null }>()
  for (const r of sbStats.rateCache as Array<{
    rtname: string
    rate_single: string | null
    rate_double: string | null
  }>) {
    if (!rateByName.has(r.rtname)) {
      rateByName.set(r.rtname, {
        single: r.rate_single != null ? Number(r.rate_single) : null,
        double: r.rate_double != null ? Number(r.rate_double) : null,
      })
    }
  }
  // Fall back to today's occupancy single rates if the cache is empty
  if (rateByName.size === 0 && todayOccupancy) {
    for (const room of todayOccupancy.rooms) {
      if (room.rateSingle != null) rateByName.set(room.rtname, { single: room.rateSingle, double: null })
    }
  }
  const ratesData = [...rateByName.entries()].map(([name, v]) => ({
    name: name.replace(/\s*\(.*\)/, "").trim(),
    single: v.single,
    double: v.double,
  }))

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
            <Link
              href="/admin/bookings"
              className="flex items-center gap-1.5 rounded-lg border border-[#b8973a]/40 bg-[#b8973a]/10 px-3 py-1.5 font-mono text-[11px] text-[#b8973a] hover:bg-[#b8973a]/20 transition-colors"
            >
              <CalendarDays className="size-3.5" />
              Bookings
            </Link>
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
            <StatCard
              label="Room types"
              value={estData?.roomTypes.size ?? "—"}
              sub="From NightsBridge"
              icon={BedDouble}
              color="bg-[#b8973a]/10 text-[#b8973a]"
            />
            <StatCard
              label="Rooms available today"
              value={`${availableToday} / ${totalToday}`}
              sub={`${bookedToday} booked · ${today()}`}
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
          </div>
        </div>

        {/* ── Section 1b: Analytics ─────────────────────────── */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-gray-400">
            <BarChart3 className="size-3.5 text-[#b8973a]" />
            Analytics
          </h2>
          <AnalyticsCharts
            trend={trendData}
            rates={ratesData}
            totalRooms={totalRooms}
            todayAvailable={availableToday}
            todayBooked={bookedToday}
          />
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

        {/* ── Section 3: Availability calendar (real bookings) ── */}
        {roomOccupancy.length > 0 ? (
          <div>
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-gray-400">
                <CalendarDays className="size-3.5 text-[#b8973a]" />
                Availability calendar · {totalRooms} rooms
              </h2>
              <a
                href={NB_CALENDAR}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-mono text-[10px] text-gray-500 transition-colors hover:text-gray-800"
              >
                Open in NightsBridge
                <ExternalLink className="size-3" />
              </a>
            </div>
            <AvailabilityCalendar
              days={roomOccupancy.map((d) => ({ date: d.date, available: d.available, total: d.total, rooms: [] }))}
            />
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

        </div>

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
