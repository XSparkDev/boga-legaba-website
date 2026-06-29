"use client"

import { useState } from "react"
import { Loader2, AlertTriangle, ArrowRight, X, Check, Mail, Calendar, Moon, BedDouble, UtensilsCrossed, Utensils } from "lucide-react"
import type { MealPlanRate } from "@/lib/nightsbridge-rates"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BookingWidgetProps {
  roomTypeName: string
  arrive: string
  depart: string
  bbid: number
  mealPlans: MealPlanRate[] | null
  available: boolean
  whatsappUrl: string
  /** From NightsBridge room type — enforced in form and passed to bot */
  maxAdults?: number | null
  maxOccupancy?: number | null
}

type Step = "idle" | "form" | "submitting" | "success" | "error"

interface ConfirmationData {
  bookingId?: string
  propertyName?: string
  arrival?: string
  leaving?: string
  nights?: string
  rooms?: string
  total?: string
  deposit?: string
  paymentNote?: string
  contacts?: string
  phone?: string
  cell?: string
  email?: string
  website?: string
  address?: string
  directions?: string
}

const MEAL_PLAN_ORDER = [5, 1, 3] // Room Only, B&B, DBB

function MealIcon({ id }: { id: number }) {
  if (id === 5) return <BedDouble className="size-4 shrink-0 text-[#b8973a]" />
  if (id === 1) return <Utensils className="size-4 shrink-0 text-[#b8973a]" />
  if (id === 3) return <UtensilsCrossed className="size-4 shrink-0 text-[#b8973a]" />
  return <BedDouble className="size-4 shrink-0 text-[#b8973a]" />
}

function fmt(n: number) {
  return `R ${Math.round(n).toLocaleString("en-ZA")}`
}

function fmtDateWidget(raw: string | undefined): string {
  if (!raw) return ""
  // Already formatted (e.g. "15 Jul 2026") — return as-is
  if (/[a-zA-Z]/.test(raw)) return raw
  // ISO date (e.g. "2026-07-15")
  const d = new Date(raw)
  return isNaN(d.getTime()) ? raw : d.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BookingWidget({
  roomTypeName,
  arrive,
  depart,
  bbid,
  mealPlans,
  available,
  whatsappUrl,
  maxAdults: rawMaxAdults,
  maxOccupancy: rawMaxOccupancy,
}: BookingWidgetProps) {
  // NightsBridge limits — fall back to safe defaults when not provided
  const maxAdults = rawMaxAdults ?? 4
  const maxOccupancy = rawMaxOccupancy ?? maxAdults
  const sorted = mealPlans
    ? [...mealPlans].sort((a, b) => {
        const ia = MEAL_PLAN_ORDER.indexOf(a.mealplanid)
        const ib = MEAL_PLAN_ORDER.indexOf(b.mealplanid)
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
      })
    : []

  const [step, setStep] = useState<Step>("idle")
  const [selectedPlan, setSelectedPlan] = useState<MealPlanRate | null>(sorted[0] ?? null)
  const [bookingRef, setBookingRef] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(null)
  const [errorMsg, setErrorMsg] = useState("")

  // Form fields — every field NightsBridge collects
  const [adults, setAdults] = useState(2)
  const [children1, setChildren1] = useState(0)  // Age 0–5 (free)
  const [children2, setChildren2] = useState(0)  // Age 6–12 (R150/night)
  const [firstname, setFirstname] = useState("")
  const [surname, setSurname] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [emailVerify, setEmailVerify] = useState("")
  const [arrivalTime, setArrivalTime] = useState("")
  const [airline, setAirline] = useState("")
  const [flightno, setFlightno] = useState("")
  const [notes, setNotes] = useState("")
  const [emailMismatch, setEmailMismatch] = useState(false)
  const [occupancyError, setOccupancyError] = useState("")

  const nbUrl = `https://book.nightsbridge.com/${bbid}?arrive=${arrive}&depart=${depart}`

  // Recompute occupancy error whenever counts change
  const totalGuests = adults + children1 + children2
  const adultsOverLimit = adults > maxAdults
  const totalOverLimit = totalGuests > maxOccupancy

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPlan) return

    // Mirror NightsBridge occupancy validation before hitting the bot
    if (adultsOverLimit) {
      setOccupancyError(`This room allows a maximum of ${maxAdults} adult${maxAdults === 1 ? "" : "s"}.`)
      return
    }
    if (totalOverLimit) {
      setOccupancyError(`This room fits a maximum of ${maxOccupancy} guest${maxOccupancy === 1 ? "" : "s"} in total.`)
      return
    }
    setOccupancyError("")

    if (email !== emailVerify) {
      setEmailMismatch(true)
      return
    }
    setEmailMismatch(false)

    setStep("submitting")

    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkin: arrive,
          checkout: depart,
          roomTypeName,
          mealPlanName: selectedPlan.description,
          adults,
          children1,
          children2,
          firstname,
          surname,
          phone,
          email,
          arrivalTime,
          airline,
          flightno,
          notes,
          paymentMethod: "bank_transfer",
          maxAdults,
          maxOccupancy,
        }),
      })

      const data = (await res.json()) as {
        ok: boolean
        bookingRef?: string
        error?: string
        confirmation?: ConfirmationData
      }

      if (data.ok) {
        setBookingRef(data.bookingRef ?? null)
        setConfirmation(data.confirmation ?? null)
        setStep("success")
      } else {
        setErrorMsg(data.error ?? "Booking failed. Please try WhatsApp or call us.")
        setStep("error")
      }
    } catch {
      setErrorMsg("Network error. Please try again or contact us via WhatsApp.")
      setStep("error")
    }
  }

  if (!available) return null

  // ── Success ──────────────────────────────────────────────────────────────
  if (step === "success") {
    const details = [
      { label: "Booking ID", value: confirmation?.bookingId || bookingRef, icon: <Check className="size-3.5 text-[#b8973a]" /> },
      { label: "Check-in",   value: fmtDateWidget(confirmation?.arrival),  icon: <Calendar className="size-3.5 text-[#b8973a]" /> },
      { label: "Check-out",  value: fmtDateWidget(confirmation?.leaving),  icon: <Calendar className="size-3.5 text-[#b8973a]" /> },
      { label: "Nights",     value: confirmation?.nights,                  icon: <Moon className="size-3.5 text-[#b8973a]" /> },
      { label: "Room",       value: confirmation?.rooms,                   icon: <BedDouble className="size-3.5 text-[#b8973a]" /> },
      { label: "Total",      value: confirmation?.total,                   icon: <Check className="size-3.5 text-[#b8973a]" /> },
    ].filter((r) => r.value)

    return (
      <div className="overflow-hidden rounded-xl border border-[#E8E0D4] bg-white shadow-sm">

        {/* Lodge header */}
        <div className="px-6 py-5 text-center" style={{ background: "#0A0A0A" }}>
          <div
            className="mx-auto mb-3 flex items-center justify-center rounded-full"
            style={{ width: 48, height: 48, background: "#F2EDE4", border: "2px solid #C9A84C" }}
          >
            <Check className="size-5" style={{ color: "#C9A84C", strokeWidth: 2.5 }} />
          </div>
          <h3 className="font-serif text-lg font-normal" style={{ color: "#C9A84C", letterSpacing: "0.02em" }}>
            Booking Confirmed
          </h3>
          <p className="mt-1 font-body text-xs" style={{ color: "#8C7B6B" }}>
            We look forward to welcoming you to the bush
          </p>
        </div>

        {/* Booking details */}
        {details.length > 0 && (
          <div className="px-5 pt-4 pb-3">
            <div className="overflow-hidden rounded-lg" style={{ border: "1px solid #E8E0D4" }}>
              {details.map((row, i) => (
                <div
                  key={row.label}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    background: i % 2 === 0 ? "#FAFAF8" : "#F2EDE4",
                    borderBottom: i < details.length - 1 ? "1px solid #E8E0D4" : "none",
                  }}
                >
                  {row.icon}
                  <span className="font-body text-[11px] font-medium uppercase tracking-wide shrink-0" style={{ color: "#8C7B6B", width: 68 }}>
                    {row.label}
                  </span>
                  <span
                    className="font-body text-sm font-semibold ml-auto text-right"
                    style={{ color: row.label === "Total" ? "#B8973B" : "#3D3532" }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment instructions — NightsBridge emails the guest how to pay */}
        <div className="px-5 pb-4 space-y-3">
          <div className="flex items-start gap-3 rounded-xl px-4 py-4" style={{ background: "#F2EDE4", border: "1px solid #E8E0D4" }}>
            <Mail className="size-5 shrink-0 mt-0.5" style={{ color: "#B8973B" }} />
            <div>
              <p className="font-body text-sm font-semibold" style={{ color: "#3D3532" }}>
                Check your email to complete payment
              </p>
              <p className="font-body text-xs mt-1 leading-relaxed" style={{ color: "#8C7B6B" }}>
                NightsBridge has emailed <strong style={{ color: "#3D3532" }}>{email}</strong> with your
                booking confirmation and payment instructions. Please follow those instructions to secure your stay.
              </p>
            </div>
          </div>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-body text-sm font-medium transition-all"
            style={{ background: "#FAFAF8", color: "#8C7B6B", border: "1px solid #E8E0D4" }}
          >
            Need help? Message us on WhatsApp
          </a>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 text-center" style={{ background: "#FAFAF8", borderTop: "1px solid #E8E0D4" }}>
          <p className="font-body text-xs" style={{ color: "#8C7B6B" }}>
            A confirmation has been sent to <strong style={{ color: "#3D3532" }}>{email}</strong>
          </p>
        </div>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (step === "error") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-500" />
          <div>
            <p className="font-medium text-red-800">Booking could not be completed</p>
            <p className="mt-1 text-sm text-red-600">{errorMsg}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setStep("form")}
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Try again
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-[#25D366] px-4 py-2 text-sm font-medium text-white hover:brightness-105"
          >
            WhatsApp
          </a>
        </div>
      </div>
    )
  }

  // ── Idle ──────────────────────────────────────────────────────────────────
  if (step === "idle") {
    return (
      <button
        onClick={() => setStep("form")}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#b8973a] px-6 py-3.5 font-body text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:brightness-110 active:translate-y-0"
      >
        Book This Room
        <ArrowRight className="size-4" />
      </button>
    )
  }

  // ── Submitting ────────────────────────────────────────────────────────────
  if (step === "submitting") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[#b8973a]/30 bg-[#fdf8ef] py-8">
        <Loader2 className="size-8 animate-spin text-[#b8973a]" />
        <p className="text-sm font-medium text-gray-700">Processing your booking&hellip;</p>
        <p className="text-xs text-gray-400">This can take up to 60 seconds</p>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <p className="font-body text-sm font-semibold text-gray-900">Complete your booking</p>
          <p className="font-body text-xs text-gray-400">{roomTypeName}</p>
        </div>
        <button
          onClick={() => setStep("idle")}
          aria-label="Close"
          className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="size-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 p-5">
        {/* Meal plan */}
        {sorted.length > 0 && (
          <div>
            <p className="mb-2 font-body text-xs font-semibold uppercase tracking-wide text-gray-500">
              Meal plan
            </p>
            <div className="space-y-2">
              {sorted.map((plan) => (
                <label
                  key={plan.mealplanid}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
                    selectedPlan?.mealplanid === plan.mealplanid
                      ? "border-[#b8973a] bg-[#fdf8ef]"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="mealPlan"
                      checked={selectedPlan?.mealplanid === plan.mealplanid}
                      onChange={() => setSelectedPlan(plan)}
                      className="accent-[#b8973a]"
                    />
                    <MealIcon id={plan.mealplanid} />
                    <span className="font-body text-sm text-gray-800">{plan.description}</span>
                  </div>
                  <span className="font-body text-sm font-semibold text-[#b8973a]">
                    {plan.rateSingle != null ? `from ${fmt(plan.rateSingle)}` : ""}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Guests */}
        <div>
          <p className="mb-2 font-body text-xs font-semibold uppercase tracking-wide text-gray-500">
            Guests
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Adults", value: adults, set: setAdults, min: 1, max: maxAdults },
              { label: "Children 0-5", value: children1, set: setChildren1, min: 0, max: Math.max(0, maxOccupancy - adults - children2) },
              { label: "Children 6-12", value: children2, set: setChildren2, min: 0, max: Math.max(0, maxOccupancy - adults - children1) },
            ].map(({ label, value, set, min, max }) => {
              const atMin = value <= min
              const atMax = value >= max
              return (
                <div key={label}>
                  <label className="mb-1 block font-body text-[11px] text-gray-400">{label}</label>
                  <div className="flex items-center gap-1">
                    {/* Minus button — fades out at minimum */}
                    <button
                      type="button"
                      onClick={() => set(Math.max(min, value - 1))}
                      disabled={atMin}
                      className={`flex size-7 items-center justify-center rounded-md border font-medium transition-all ${
                        atMin
                          ? "cursor-not-allowed border-gray-100 text-gray-200"
                          : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      &minus;
                    </button>

                    {/* Count — turns amber when at limit */}
                    <span className={`w-6 text-center font-body text-sm font-bold transition-colors ${
                      atMax && max > min ? "text-amber-500" : "text-gray-800"
                    }`}>
                      {value}
                    </span>

                    {/* Plus button — turns amber and locks at maximum */}
                    <button
                      type="button"
                      onClick={() => set(Math.min(max, value + 1))}
                      disabled={atMax}
                      className={`flex size-7 items-center justify-center rounded-md border font-medium transition-all ${
                        atMax
                          ? "cursor-not-allowed border-amber-200 bg-amber-50 text-amber-300"
                          : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      +
                    </button>
                  </div>
                  {/* "Max" label under the counter when at limit */}
                  {atMax && max > min && (
                    <p className="mt-0.5 font-body text-[10px] font-semibold text-amber-500">Max</p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Policy hint */}
          <p className="mt-2 font-body text-[10px] text-gray-400">
            Children 0-5 stay free &middot; Children 6-12 pay R150/night
            {rawMaxAdults ? ` · Max ${maxAdults} adult${maxAdults === 1 ? "" : "s"}, ${maxOccupancy} total` : ""}
          </p>

          {/* Real-time capacity warning — amber when full, red only on invalid submit */}
          {totalGuests >= maxOccupancy && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />
              <p className="font-body text-xs text-amber-700">
                Room at full capacity &mdash; maximum {maxOccupancy} guest{maxOccupancy !== 1 ? "s" : ""}.
              </p>
            </div>
          )}
          {occupancyError && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <AlertTriangle className="size-3.5 shrink-0 text-red-500" />
              <p className="font-body text-xs text-red-600">{occupancyError}</p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100" />

        {/* Personal information */}
        <div>
          <p className="mb-3 font-body text-xs font-semibold uppercase tracking-wide text-gray-500">
            Personal information
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="First name *">
                <input
                  type="text"
                  value={firstname}
                  onChange={(e) => setFirstname(e.target.value)}
                  placeholder="John F.G."
                  required
                  className={inputCls}
                />
              </FormField>
              <FormField label="Surname *">
                <input
                  type="text"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  placeholder="Surname"
                  required
                  className={inputCls}
                />
              </FormField>
            </div>

            <FormField label="Phone number * (include country code)">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+27 82 123 4567"
                required
                className={inputCls}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Email *">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailMismatch(false) }}
                  placeholder="your@email.com"
                  required
                  className={inputCls}
                />
              </FormField>
              <FormField label="Re-type email *">
                <input
                  type="email"
                  value={emailVerify}
                  onChange={(e) => { setEmailVerify(e.target.value); setEmailMismatch(false) }}
                  placeholder="your@email.com"
                  required
                  className={`${inputCls} ${emailMismatch ? "border-red-400 ring-1 ring-red-300" : ""}`}
                />
              </FormField>
            </div>
            {emailMismatch && (
              <p className="font-body text-xs text-red-500">Email addresses do not match.</p>
            )}

            <FormField label="Approx. arrival time">
              <input
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className={inputCls}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Airline (if applicable)">
                <input
                  type="text"
                  value={airline}
                  onChange={(e) => setAirline(e.target.value)}
                  placeholder="e.g. FlySafair"
                  className={inputCls}
                />
              </FormField>
              <FormField label="Flight no. (if applicable)">
                <input
                  type="text"
                  value={flightno}
                  onChange={(e) => setFlightno(e.target.value)}
                  placeholder="e.g. FA123"
                  className={inputCls}
                />
              </FormField>
            </div>

            <FormField label="Special requests">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requirements or requests?"
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </FormField>
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* Payment */}
        <div>
          <p className="mb-2 font-body text-xs font-semibold uppercase tracking-wide text-gray-500">
            Payment
          </p>
          <div className="rounded-lg border border-[#b8973a] bg-[#fdf8ef] p-3">
            <span className="font-body text-sm text-gray-800">Pay via the NightsBridge email</span>
            <p className="mt-0.5 font-body text-[11px] text-gray-400">
              Once we confirm your booking, NightsBridge emails you the booking details and payment
              instructions. Complete payment from that email to secure your stay.
            </p>
          </div>
          <p className="mt-2 font-body text-[11px] text-gray-400">
            Prefer to book directly?{" "}
            <a
              href={nbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#b8973a] underline underline-offset-2 hover:brightness-75"
            >
              Continue on NightsBridge
            </a>
          </p>
        </div>

        {/* T&Cs */}
        <label className="flex items-start gap-2 text-xs text-gray-500">
          <input type="checkbox" required className="mt-0.5 accent-[#b8973a]" />
          <span>
            I have read and accepted the{" "}
            <a
              href="#"
              className="text-[#b8973a] underline"
              onClick={(e) => e.preventDefault()}
            >
              terms and conditions
            </a>{" "}
            including the cancellation policy.
          </span>
        </label>

        {/* Cancellation note */}
        <div className="rounded-lg px-4 py-3" style={{ background: "#F2EDE4", border: "1px solid #E8E0D4" }}>
          <p className="font-body text-[11px] leading-relaxed" style={{ color: "#8C7B6B" }}>
            <strong style={{ color: "#3D3532" }}>Need to cancel?</strong>{" "}
            Contact us via{" "}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
              style={{ color: "#b8973a" }}
            >
              WhatsApp
            </a>{" "}
            and quote your booking reference. Cancellation terms apply.
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!selectedPlan}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#b8973a] px-6 py-3.5 font-body text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:brightness-110 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Confirm Booking
          <ArrowRight className="size-4" />
        </button>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm text-gray-900 placeholder:text-gray-300 focus:border-[#b8973a] focus:outline-none focus:ring-1 focus:ring-[#b8973a]/30"

function FormField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block font-body text-[11px] font-medium text-gray-500">{label}</label>
      {children}
    </div>
  )
}
