"use client"

import { useState, useMemo } from "react"
import {
  ArrowLeft,
  CheckCircle2,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Loader2,
  X,
  ArrowRight,
  Users,
  BedDouble,
  CalendarDays,
  Shield,
  FileText,
  Building2,
} from "lucide-react"
import Link from "next/link"
import type { BookingRow } from "@/app/(main)/admin/bookings/page"
import { BookingExtrasPanel } from "@/components/admin/booking-extras-panel"

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS: Record<string, { label: string; cls: string }> = {
  C: { label: "Confirmed",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  P: { label: "Provisional",  cls: "bg-amber-50  text-amber-700  border-amber-200"  },
  W: { label: "Awaiting Dep", cls: "bg-orange-50 text-orange-700 border-orange-200" },
  S: { label: "Paid",         cls: "bg-blue-50   text-blue-700   border-blue-200"   },
  R: { label: "Reserved",     cls: "bg-purple-50 text-purple-700 border-purple-200" },
  O: { label: "Outstanding",  cls: "bg-red-50    text-red-700    border-red-200"    },
  U: { label: "Unavailable",  cls: "bg-gray-100  text-gray-500   border-gray-200"   },
}

function StatusBadge({ code }: { code: string | null }) {
  const s = STATUS[code ?? ""] ?? { label: code ?? "?", cls: "bg-gray-100 text-gray-500 border-gray-200" }
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${s.cls}`}>
      {s.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" })
    .format(new Date(`${iso}T12:00:00`))
}

function nightsBetween(from: string, to: string) {
  return Math.round((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86_400_000)
}

const todayStr = () => new Date().toISOString().slice(0, 10)

// ---------------------------------------------------------------------------
// Tab filter
// ---------------------------------------------------------------------------

type Tab = "all" | "arriving" | "inhouse" | "departing" | "provisional"

function filterBookings(bookings: BookingRow[], tab: Tab): BookingRow[] {
  const today = todayStr()
  switch (tab) {
    case "arriving":   return bookings.filter(b => b.from_date === today)
    case "inhouse":    return bookings.filter(b => b.from_date < today && b.to_date > today)
    case "departing":  return bookings.filter(b => b.to_date === today)
    case "provisional":return bookings.filter(b => b.status === "P" || b.status === "W")
    default:           return bookings
  }
}

// ---------------------------------------------------------------------------
// Add Booking modal
// ---------------------------------------------------------------------------

const inputCls = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm text-gray-900 placeholder:text-gray-300 focus:border-[#996948] focus:outline-none focus:ring-1 focus:ring-[#996948]/30"

type BookingFormState = {
  checkin: string; checkout: string; roomTypeName: string; mealPlanName: string
  adults: string; firstname: string; surname: string; phone: string; email: string; notes: string
}

const EMPTY_FORM: BookingFormState = {
  checkin: "", checkout: "", roomTypeName: "", mealPlanName: "Room Only",
  adults: "2", firstname: "", surname: "", phone: "", email: "", notes: "",
}

const ROOM_TYPES = [
  "Twin Room (Shower)", "Twin Room (Bath)", "Double Room (Shower)", "Double Room (Bath)",
  "Family Room", "Executive Suite", "Conference Room",
]
const MEAL_PLANS = ["Room Only", "Bed & Breakfast", "Dinner, Bed & Breakfast"]

function AddBookingModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<BookingFormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string; bookingRef?: string } | null>(null)

  const set = (key: keyof BookingFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setResult(null)
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkin: form.checkin,
          checkout: form.checkout,
          roomTypeName: form.roomTypeName,
          mealPlanName: form.mealPlanName,
          adults: parseInt(form.adults) || 2,
          firstname: form.firstname,
          surname: form.surname,
          phone: form.phone,
          email: form.email,
          notes: form.notes,
          paymentMethod: "bank_transfer",
        }),
      })
      const data = await res.json() as { ok: boolean; bookingRef?: string; error?: string; confirmation?: { bookingId?: string } }
      if (data.ok) {
        const ref = data.confirmation?.bookingId || data.bookingRef || ""
        setResult({ ok: true, message: `Booking created successfully!`, bookingRef: ref })
      } else {
        setResult({ ok: false, message: data.error ?? "Booking failed" })
      }
    } catch {
      setResult({ ok: false, message: "Network error — please try again" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="font-serif text-base font-bold text-gray-900">Add Booking</p>
            <p className="font-mono text-[11px] text-gray-400">Creates a real booking on NightsBridge</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="size-4" />
          </button>
        </div>

        {result ? (
          <div className="p-6">
            <div className={`rounded-xl border p-4 ${result.ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
              {result.ok
                ? <CheckCircle2 className="mx-auto mb-2 size-8 text-emerald-500" />
                : <AlertTriangle className="mx-auto mb-2 size-8 text-red-500" />}
              <p className={`text-center font-medium ${result.ok ? "text-emerald-800" : "text-red-700"}`}>{result.message}</p>
              {result.bookingRef && (
                <p className="mt-1 text-center font-mono text-sm text-emerald-600">Booking ID: {result.bookingRef}</p>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setResult(null); setForm(EMPTY_FORM) }} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Add another
              </button>
              <button onClick={onClose} className="flex-1 rounded-lg bg-[#996948] py-2 text-sm font-semibold text-white hover:brightness-110">
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-mono text-[11px] text-gray-500">Check-in *</label>
                <input type="date" value={form.checkin} onChange={set("checkin")} required className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[11px] text-gray-500">Check-out *</label>
                <input type="date" value={form.checkout} onChange={set("checkout")} required className={inputCls} />
              </div>
            </div>
            {/* Room + Meal plan */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-mono text-[11px] text-gray-500">Room type *</label>
                <select value={form.roomTypeName} onChange={set("roomTypeName")} required className={inputCls}>
                  <option value="">Select room…</option>
                  {ROOM_TYPES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block font-mono text-[11px] text-gray-500">Meal plan *</label>
                <select value={form.mealPlanName} onChange={set("mealPlanName")} className={inputCls}>
                  {MEAL_PLANS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            {/* Adults */}
            <div>
              <label className="mb-1 block font-mono text-[11px] text-gray-500">Adults</label>
              <input type="number" min={1} max={4} value={form.adults} onChange={set("adults")} className={inputCls} />
            </div>
            <div className="border-t border-gray-100" />
            {/* Guest info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-mono text-[11px] text-gray-500">First name *</label>
                <input type="text" value={form.firstname} onChange={set("firstname")} required placeholder="First name" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[11px] text-gray-500">Surname *</label>
                <input type="text" value={form.surname} onChange={set("surname")} required placeholder="Surname" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="mb-1 block font-mono text-[11px] text-gray-500">Phone * (include country code)</label>
              <input type="tel" value={form.phone} onChange={set("phone")} required placeholder="+27 82 000 0000" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[11px] text-gray-500">Email *</label>
              <input type="email" value={form.email} onChange={set("email")} required placeholder="guest@email.com" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[11px] text-gray-500">Notes / special requests</label>
              <textarea value={form.notes} onChange={set("notes")} rows={2} className={`${inputCls} resize-none`} />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#996948] py-3 font-mono text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
            >
              {submitting ? <><Loader2 className="size-4 animate-spin" /> Creating booking on NightsBridge…</> : <><Plus className="size-4" /> Create Booking</>}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Action button — Check In / Check Out
// ---------------------------------------------------------------------------

function ActionButton({
  label, icon: Icon, bookingRef, action, variant,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  bookingRef: number
  action: "checkin" | "checkout"
  variant: "green" | "red"
}) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  async function handleClick() {
    if (done) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/manage-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingRef, action }),
      })
      const data = await res.json() as { ok: boolean; message?: string; error?: string; nbUrl?: string }
      if (data.ok) {
        setDone(true)
      } else {
        setError(data.error ?? "Action failed")
      }
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const base = variant === "green"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
    : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading || done}
        title={error || label}
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[11px] font-semibold transition-colors disabled:opacity-60 ${base} ${done ? "opacity-60" : ""}`}
      >
        {loading
          ? <Loader2 className="size-3.5 animate-spin" />
          : done
            ? <CheckCircle2 className="size-3.5" />
            : <Icon className="size-3.5" />
        }
        {done ? "Done" : label}
      </button>
      {error && <p className="mt-1 font-mono text-[9px] text-red-500 max-w-[140px] leading-tight">{error}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BookingsClient({ bookings }: { bookings: BookingRow[] }) {
  const [tab, setTab] = useState<Tab>("all")
  const [showAdd, setShowAdd] = useState(false)
  const [panelBooking, setPanelBooking] = useState<BookingRow | null>(null)

  const today = todayStr()

  // Summary counts
  const arriving   = bookings.filter(b => b.from_date === today).length
  const inhouse    = bookings.filter(b => b.from_date < today && b.to_date > today).length
  const departing  = bookings.filter(b => b.to_date === today).length
  const provisional = bookings.filter(b => b.status === "P" || b.status === "W").length

  const filtered = useMemo(() => filterBookings(bookings, tab), [bookings, tab])

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "all",         label: "All bookings",  count: bookings.length },
    { id: "arriving",    label: "Arriving today", count: arriving },
    { id: "inhouse",     label: "In house",       count: inhouse },
    { id: "departing",   label: "Departing today",count: departing },
    { id: "provisional", label: "Provisional",    count: provisional },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b border-white/10 bg-[#000000] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/admin/dashboard" className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-white/50 hover:text-white/80 transition-colors">
              <ArrowLeft className="size-3.5" />
              Dashboard
            </Link>
            <span className="text-white/20">/</span>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#996948]/20">
                <CalendarDays className="size-3.5 text-[#996948]" />
              </div>
              <span className="font-serif text-sm font-bold text-white">Bookings</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/bookings"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[11px] text-white/60 hover:text-white transition-colors"
            >
              <RefreshCw className="size-3" />
              Refresh
            </Link>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#996948] px-3 py-1.5 font-mono text-[11px] font-semibold text-white hover:brightness-110"
            >
              <Plus className="size-3.5" />
              Add Booking
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Arriving today",  value: arriving,    icon: LogIn,       color: "text-emerald-600 bg-emerald-50", tab: "arriving"    as Tab },
            { label: "In house",        value: inhouse,     icon: BedDouble,   color: "text-blue-600    bg-blue-50",    tab: "inhouse"     as Tab },
            { label: "Departing today", value: departing,   icon: LogOut,      color: "text-red-500     bg-red-50",     tab: "departing"   as Tab },
            { label: "Provisional",     value: provisional, icon: AlertTriangle,color: "text-amber-600  bg-amber-50",  tab: "provisional" as Tab },
          ].map(({ label, value, icon: Icon, color, tab: t }) => (
            <button
              key={label}
              onClick={() => setTab(t)}
              className={`flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${tab === t ? "border-[#996948]" : "border-gray-200"}`}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
                <Icon className="size-4" />
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-gray-400">{label}</p>
                <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] font-medium transition-colors ${
                tab === t.id
                  ? "bg-[#996948] text-white"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              {t.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${tab === t.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Bookings table */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
            <CalendarDays className="mx-auto mb-3 size-10 text-gray-200" />
            <p className="font-mono text-[11px] uppercase tracking-wider text-gray-400">
              No bookings found for this filter
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {bookings.length === 0
                ? "Run a sync from the dashboard to pull bookings from NightsBridge."
                : "Try a different tab or add a booking."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["Guest", "Check-In", "Check-Out", "Nights", "Room", "Adults", "Status", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-gray-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((b) => {
                    const nights = nightsBetween(b.from_date, b.to_date)
                    const isToday = b.from_date === today
                    const canCheckin  = !b.checked_in && !b.checked_out && !!b.booking_ref
                    const canCheckout = b.checked_in  && !b.checked_out && !!b.booking_ref
                    const nbUrl = b.booking_ref
                      ? `https://www.nightsbridge.com/dashboard/booking/${b.booking_ref}`
                      : null

                    return (
                      <tr key={b.bookingid} className={`transition-colors hover:bg-gray-50/60 ${isToday ? "bg-emerald-50/30" : ""}`}>
                        <td className="px-4 py-3">
                          <p className="flex items-center gap-1.5 font-medium text-gray-900">
                            {b.made_by ?? "—"}
                            {b.is_department && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-indigo-700">
                                <Building2 className="size-2.5" /> Dept
                              </span>
                            )}
                          </p>
                          {b.made_by_email && (
                            <p className="font-mono text-[10px] text-gray-400">{b.made_by_email}</p>
                          )}
                          {b.made_by_phone && (
                            <p className="font-mono text-[10px] text-gray-400">{b.made_by_phone}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{fmtDate(b.from_date)}</p>
                          {isToday && (
                            <span className="mt-0.5 inline-block rounded-full bg-emerald-100 px-1.5 font-mono text-[9px] font-bold text-emerald-700">
                              TODAY
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{fmtDate(b.to_date)}</td>
                        <td className="px-4 py-3 font-mono text-sm text-gray-600">{nights}n</td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-700">{b.room_type ?? "—"}</p>
                          {b.avg_rate && (
                            <p className="font-mono text-[10px] text-[#996948]">
                              R {Math.round(b.avg_rate).toLocaleString("en-ZA")}/night
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Users className="size-3 text-gray-400" />
                            {b.adults ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge code={b.status} />
                          {b.checked_in && !b.checked_out && (
                            <span className="mt-1 block rounded-full bg-blue-100 px-1.5 font-mono text-[9px] font-bold text-blue-700">
                              CHECKED IN
                            </span>
                          )}
                          {b.checked_out && (
                            <span className="mt-1 block rounded-full bg-gray-100 px-1.5 font-mono text-[9px] font-bold text-gray-500">
                              DEPARTED
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {canCheckin && b.booking_ref && (
                              <ActionButton
                                label="Check In"
                                icon={LogIn}
                                bookingRef={b.booking_ref}
                                action="checkin"
                                variant="green"
                              />
                            )}
                            {canCheckout && b.booking_ref && (
                              <ActionButton
                                label="Check Out"
                                icon={LogOut}
                                bookingRef={b.booking_ref}
                                action="checkout"
                                variant="red"
                              />
                            )}
                            {nbUrl && (
                              <a
                                href={nbUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5 font-mono text-[11px] text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
                              >
                                <ExternalLink className="size-3" />
                                NightsBridge
                              </a>
                            )}
                            <button
                              onClick={() => setPanelBooking(b)}
                              className="flex items-center gap-1 rounded-lg border border-[#996948]/40 bg-[#996948]/10 px-2 py-1.5 font-mono text-[11px] text-[#996948] transition-colors hover:bg-[#996948]/20"
                            >
                              <FileText className="size-3" />
                              Invoice / Dept
                            </button>
                          </div>
                          {b.booking_ref && (
                            <p className="mt-1 font-mono text-[9px] text-gray-300">Ref #{b.booking_ref}</p>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-100 px-4 py-2.5 font-mono text-[10px] text-gray-400">
              Showing {filtered.length} of {bookings.length} bookings · Synced from NightsBridge
            </div>
          </div>
        )}

        {/* No sync yet help text */}
        {bookings.length === 0 && (
          <div className="rounded-xl border border-[#996948]/20 bg-[#fdf8ef] p-5">
            <p className="font-mono text-[11px] text-[#996948]">
              No bookings in Supabase yet. Go to the{" "}
              <Link href="/admin/dashboard" className="underline">Dashboard</Link>{" "}
              and run a sync to pull bookings from NightsBridge.
            </p>
          </div>
        )}
      </div>

      {/* Add Booking modal */}
      {showAdd && <AddBookingModal onClose={() => setShowAdd(false)} />}

      {/* Invoice & department panel */}
      {panelBooking && (
        <BookingExtrasPanel
          booking={{
            bookingid: panelBooking.bookingid,
            booking_ref: panelBooking.booking_ref != null ? String(panelBooking.booking_ref) : null,
            guest_name: panelBooking.made_by,
            guest_email: panelBooking.made_by_email,
          }}
          onClose={() => setPanelBooking(null)}
        />
      )}
    </div>
  )
}
