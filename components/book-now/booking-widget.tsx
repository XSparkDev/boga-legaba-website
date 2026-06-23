"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, AlertTriangle, ArrowRight, X, ExternalLink } from "lucide-react"
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
}

type Step = "idle" | "form" | "submitting" | "success" | "redirected" | "error"
type PaymentMethod = "bank_transfer" | "credit_card"

const MEAL_PLAN_ORDER = [5, 1, 3] // Room Only, B&B, DBB
const MEAL_ICONS: Record<number, string> = { 1: "🍳", 3: "🍽️", 5: "🛏️" }

function fmt(n: number) {
  return `R ${Math.round(n).toLocaleString("en-ZA")}`
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
}: BookingWidgetProps) {
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer")
  const [emailMismatch, setEmailMismatch] = useState(false)

  const nbUrl = `https://book.nightsbridge.com/${bbid}?arrive=${arrive}&depart=${depart}`

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPlan) return

    if (email !== emailVerify) {
      setEmailMismatch(true)
      return
    }
    setEmailMismatch(false)

    // Credit card requires 3D Secure — cannot be automated.
    // Send the guest directly to NightsBridge to complete card payment securely.
    if (paymentMethod === "credit_card") {
      window.open(nbUrl, "_blank", "noopener,noreferrer")
      setStep("redirected")
      return
    }

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
          paymentMethod,
        }),
      })

      const data = (await res.json()) as {
        ok: boolean
        bookingRef?: string
        error?: string
        confirmationText?: string
      }

      if (data.ok) {
        setBookingRef(data.bookingRef ?? null)
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
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 size-10 text-emerald-500" />
        <h3 className="mb-1 font-serif text-xl font-bold text-emerald-900">Booking Confirmed!</h3>
        {bookingRef && (
          <p className="mb-2 font-mono text-sm font-semibold text-emerald-700">
            Reference: {bookingRef}
          </p>
        )}
        <p className="text-sm text-emerald-700">
          A confirmation will be sent to <strong>{email}</strong>.
        </p>
        <p className="mt-2 text-xs text-emerald-600">
          Banking details for your EFT payment will be included in the confirmation email.
        </p>
        <p className="mt-3 text-xs text-emerald-500">
          {roomTypeName} &middot; {arrive} &rarr; {depart}
          {selectedPlan ? ` · ${selectedPlan.description}` : ""}
        </p>
      </div>
    )
  }

  // ── Credit card redirect ──────────────────────────────────────────────────
  if (step === "redirected") {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
        <div className="flex items-start gap-3">
          <ExternalLink className="mt-0.5 size-5 shrink-0 text-blue-500" />
          <div>
            <p className="font-body font-semibold text-blue-900">NightsBridge opened in a new tab</p>
            <p className="mt-1 text-sm text-blue-700">
              Please select <strong>{roomTypeName}</strong> with{" "}
              <strong>{selectedPlan?.description}</strong> and complete your credit card payment
              there. Your dates ({arrive} &rarr; {depart}) are pre-filled.
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <a
            href={nbUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:brightness-105"
          >
            Open NightsBridge again
            <ExternalLink className="size-3.5" />
          </a>
          <button
            onClick={() => setStep("form")}
            className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
          >
            Go back
          </button>
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
                    <span className="text-base leading-none">{MEAL_ICONS[plan.mealplanid] ?? "🍴"}</span>
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
              { label: "Adults", value: adults, set: setAdults, min: 1, max: 4 },
              { label: "Children 0–5", value: children1, set: setChildren1, min: 0, max: 4 },
              { label: "Children 6–12", value: children2, set: setChildren2, min: 0, max: 4 },
            ].map(({ label, value, set, min, max }) => (
              <div key={label}>
                <label className="mb-1 block font-body text-[11px] text-gray-400">{label}</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => set(Math.max(min, value - 1))}
                    className="flex size-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50"
                  >
                    &minus;
                  </button>
                  <span className="w-6 text-center font-body text-sm font-semibold">{value}</span>
                  <button
                    type="button"
                    onClick={() => set(Math.min(max, value + 1))}
                    className="flex size-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-1 font-body text-[10px] text-gray-400">
            Children 0–5 stay free &middot; Children 6–12 pay R150/night
          </p>
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

        {/* Payment method */}
        <div>
          <p className="mb-2 font-body text-xs font-semibold uppercase tracking-wide text-gray-500">
            Payment method
          </p>
          <div className="space-y-2">
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                paymentMethod === "bank_transfer"
                  ? "border-[#b8973a] bg-[#fdf8ef]"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                checked={paymentMethod === "bank_transfer"}
                onChange={() => setPaymentMethod("bank_transfer")}
                className="mt-0.5 accent-[#b8973a]"
              />
              <div>
                <span className="font-body text-sm text-gray-800">Bank Transfer (EFT)</span>
                <p className="font-body text-[11px] text-gray-400">
                  Banking details will be emailed after confirmation. Booking is secured immediately.
                </p>
              </div>
            </label>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                paymentMethod === "credit_card"
                  ? "border-[#b8973a] bg-[#fdf8ef]"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                checked={paymentMethod === "credit_card"}
                onChange={() => setPaymentMethod("credit_card")}
                className="mt-0.5 accent-[#b8973a]"
              />
              <div>
                <span className="font-body text-sm text-gray-800">Credit Card</span>
                <p className="font-body text-[11px] text-gray-400">
                  You will be taken to NightsBridge&apos;s secure payment page to enter your card details.
                </p>
              </div>
            </label>
          </div>
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
              terms &amp; conditions
            </a>{" "}
            including the cancellation policy.
          </span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={!selectedPlan}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#b8973a] px-6 py-3.5 font-body text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:brightness-110 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {paymentMethod === "credit_card" ? (
            <>
              Continue to Payment
              <ExternalLink className="size-4" />
            </>
          ) : (
            <>
              Confirm Booking
              <ArrowRight className="size-4" />
            </>
          )}
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
