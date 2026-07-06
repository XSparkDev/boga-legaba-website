"use client"

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"

// ---------------------------------------------------------------------------
// Types — all props are plain serialisable data passed from the server page
// ---------------------------------------------------------------------------

export type TrendPoint = { date: string; available: number; booked: number }
export type RatePoint = { name: string; single: number | null; double: number | null }

// Height for the horizontal rates chart grows with the number of room types so
// every label has room to breathe on mobile.
function ratesHeight(n: number) {
  return Math.max(180, n * 38 + 40)
}

const GOLD = "#996948"
const INK = "#000000"
const EMERALD = "#10b981"
const RED = "#ef4444"

function rand(n: number) {
  return `R ${Math.round(n).toLocaleString("en-ZA")}`
}

function CardShell({
  title,
  children,
  className = "",
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}>
      <h3 className="mb-4 font-mono text-[11px] uppercase tracking-wider text-gray-500">{title}</h3>
      {children}
    </div>
  )
}

export function AnalyticsCharts({
  trend,
  rates,
  totalRooms,
  todayAvailable,
  todayBooked,
}: {
  trend: TrendPoint[]
  rates: RatePoint[]
  totalRooms: number
  todayAvailable: number
  todayBooked: number
}) {
  const donut = [
    { name: "Booked", value: todayBooked, color: GOLD },
    { name: "Available", value: todayAvailable, color: EMERALD },
  ].filter((d) => d.value > 0)
  const hasDonut = todayBooked + todayAvailable > 0
  const hasRates = rates.some((r) => r.single != null || r.double != null)
  const occupancyPct = totalRooms > 0 ? Math.round((todayBooked / totalRooms) * 100) : 0

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Rooms occupied trend — area chart */}
      <CardShell title="Rooms occupied · next 30 days" className="lg:col-span-2">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="occFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "#9ca3af" }}
                interval={Math.max(0, Math.floor(trend.length / 7))}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                allowDecimals={false}
                domain={[0, totalRooms]}
                tick={{ fontSize: 9, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                labelStyle={{ fontWeight: 600 }}
                formatter={(v: number) => [`${v} of ${totalRooms} rooms`, "Occupied"]}
              />
              <Area
                type="monotone"
                dataKey="booked"
                name="Rooms occupied"
                stroke={GOLD}
                strokeWidth={2}
                fill="url(#occFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardShell>

      {/* Today's occupancy — donut with centre label */}
      <CardShell title="Today · occupancy">
        <div className="relative h-56 w-full">
          {hasDonut ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donut}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={54}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {donut.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                    formatter={(v: number, n) => [`${v} rooms`, n]}
                  />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              {/* Centre label */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-6">
                <span className="font-serif text-2xl font-bold text-gray-900">
                  {todayBooked}/{totalRooms}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-gray-400">
                  {occupancyPct}% booked
                </span>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-center font-mono text-[11px] text-gray-400">
              No occupancy data for today
            </div>
          )}
        </div>
      </CardShell>

      {/* Rates by room type — HORIZONTAL bars (mobile-safe labels) */}
      <CardShell title="Rates by room type · per night" className="lg:col-span-3">
        {hasRates ? (
          <div className="w-full" style={{ height: ratesHeight(rates.length) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={rates}
                margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                barCategoryGap="22%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 9, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickFormatter={(v) => `R${v}`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#4b5563" }}
                  tickLine={false}
                  axisLine={false}
                  width={120}
                />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  formatter={(v: number) => rand(v)}
                  cursor={{ fill: "#00000008" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                <Bar dataKey="single" name="1 adult" fill={GOLD} radius={[0, 4, 4, 0]} maxBarSize={14} />
                <Bar dataKey="double" name="2 adults" fill={INK} radius={[0, 4, 4, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center text-center font-mono text-[11px] text-gray-400">
            No cached rates yet — they populate as the booking page is used
          </div>
        )}
      </CardShell>
    </div>
  )
}
