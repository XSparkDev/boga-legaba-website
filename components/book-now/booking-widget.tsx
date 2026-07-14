"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, AlertTriangle, ArrowRight, X, BedDouble, UtensilsCrossed, Utensils } from "lucide-react"
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

type Step = "idle" | "form" | "paying" | "error"

const MEAL_PLAN_ORDER = [5, 1, 3] // Room Only, B&B, DBB

function MealIcon({ id }: { id: number }) {
  if (id === 5) return <BedDouble className="size-4 shrink-0 text-[#996948]" />
  if (id === 1) return <Utensils className="size-4 shrink-0 text-[#996948]" />
  if (id === 3) return <UtensilsCrossed className="size-4 shrink-0 text-[#996948]" />
  return <BedDouble className="size-4 shrink-0 text-[#996948]" />
}

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
  const [errorMsg, setErrorMsg] = useState("")

  // Guards the in-place booking poll below against firing after unmount.
  const cancelledRef = useRef(false)
  useEffect(() => {
    return () => {
      cancelledRef.current = true
    }
  }, [])

  // Keep the widget in view across step changes. Submitting collapses the tall
  // form into the short "Reserving…" spinner (or the error box), which shrinks
  // the page by ~1000px while the scroll position stays put — leaving the new
  // panel above the viewport so it LOOKS like the page jumped down. Re-centering
  // the panel keeps the guest looking at it instead of stranded further down.
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (step === "paying" || step === "error") {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [step])

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

  // ── Draft persistence: don't lose typed details on an accidental refresh ────
  // Saved to sessionStorage (survives a refresh, auto-clears when the tab is
  // closed — so a guest's contact details aren't left behind on a shared
  // computer). Scoped to this exact room + dates so a draft only ever restores
  // in the same booking context, never on a different room. Every storage call
  // is best-effort: if storage is unavailable (private mode / blocked), the
  // form works exactly as before.
  const DRAFT_KEY = `bl-booking-draft:${bbid}:${roomTypeName}:${arrive}:${depart}`
  const draftHydratedRef = useRef(false)

  // Restore once on mount. Read in an effect (not during render) because
  // sessionStorage doesn't exist during SSR — this keeps it hydration-safe.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (raw) {
        const d = JSON.parse(raw) as Record<string, unknown>
        if (typeof d.adults === "number") setAdults(d.adults)
        if (typeof d.children1 === "number") setChildren1(d.children1)
        if (typeof d.children2 === "number") setChildren2(d.children2)
        if (typeof d.firstname === "string") setFirstname(d.firstname)
        if (typeof d.surname === "string") setSurname(d.surname)
        if (typeof d.phone === "string") setPhone(d.phone)
        if (typeof d.email === "string") setEmail(d.email)
        if (typeof d.emailVerify === "string") setEmailVerify(d.emailVerify)
        if (typeof d.arrivalTime === "string") setArrivalTime(d.arrivalTime)
        if (typeof d.airline === "string") setAirline(d.airline)
        if (typeof d.flightno === "string") setFlightno(d.flightno)
        if (typeof d.notes === "string") setNotes(d.notes)
        if (d.mealplanid != null) {
          const plan = sorted.find((p) => p.mealplanid === d.mealplanid)
          if (plan) setSelectedPlan(plan)
        }
        // Reopen the form if the guest had it open — but never restore into the
        // "paying"/"error" states, which no longer reflect reality after a reload.
        if (d.formOpen) setStep("form")
      }
    } catch {
      // Corrupt or blocked storage — start fresh, never break the form.
    }
    draftHydratedRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Save on every change — but only AFTER the restore above has run, so the
  // initial default values can never overwrite a saved draft (effect ordering).
  useEffect(() => {
    if (!draftHydratedRef.current) return
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          adults, children1, children2, firstname, surname, phone, email, emailVerify,
          arrivalTime, airline, flightno, notes,
          mealplanid: selectedPlan?.mealplanid ?? null,
          formOpen: step === "form",
        }),
      )
    } catch {
      // Storage full / blocked — saving is best-effort, never fatal.
    }
  }, [DRAFT_KEY, adults, children1, children2, firstname, surname, phone, email, emailVerify, arrivalTime, airline, flightno, notes, selectedPlan, step])

  // Clear the saved draft once a booking is successfully handed off to payment,
  // so returning via the back button can't re-submit the same details and
  // create a duplicate booking.
  function clearDraft() {
    try {
      sessionStorage.removeItem(DRAFT_KEY)
    } catch {
      /* best-effort */
    }
  }

  const nbUrl = `https://book.nightsbridge.com/${bbid}?arrive=${arrive}&depart=${depart}`

  // Recompute occupancy error whenever counts change
  const totalGuests = adults + children1 + children2
  const adultsOverLimit = adults > maxAdults
  const totalOverLimit = totalGuests > maxOccupancy

  // Nights between arrive and depart — used to estimate the amount to charge
  function nightsBetween(a: string, b: string): number {
    const n = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
    return n > 0 ? n : 1
  }

  // Estimated total to charge on Paystack, from the selected plan's per-night rate.
  // Pay-first: there is no NightsBridge booking yet, so we estimate from the
  // displayed rate. Children 6–12 add R150/night; 0–5 are free.
  function estimateTotal(): number {
    if (!selectedPlan) return 0
    const perNight =
      adults >= 2
        ? (selectedPlan.rateDouble ?? selectedPlan.rateSingle ?? 0)
        : (selectedPlan.rateSingle ?? selectedPlan.rateDouble ?? 0)
    return Math.round((perNight + children2 * 150) * nightsBetween(arrive, depart))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPlan) return

    // Mirror NightsBridge occupancy validation before charging
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

    const amountRands = estimateTotal()
    if (!amountRands) {
      setErrorMsg("Could not work out the price for these dates. Please contact us via WhatsApp.")
      setStep("error")
      return
    }

    const bookingPayload = {
      email,
      amountRands,
      guestName: `${firstname} ${surname}`.trim(),
      guestPhone: phone,
      checkin: arrive,
      checkout: depart,
      roomTypeName,
      mealPlanName: selectedPlan.description,
      adults,
      children1,
      children2,
      firstname,
      surname,
      arrivalTime,
      airline,
      flightno,
      notes,
      bbid,
      maxAdults,
      maxOccupancy,
    }

    // ── PAY FIRST: /api/booking/start sets up payment immediately and fires the
    // NightsBridge booking off in the background. The guest goes straight to
    // Paystack — no waiting for the ~50-90s NightsBridge job. ────────────────
    setStep("paying")
    try {
      const res = await fetch("/api/booking/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingPayload),
      })
      const data = (await res.json()) as { ok: boolean; reference?: string; paymentUrl?: string; error?: string }
      if (data.ok && data.paymentUrl) {
        // Happy path: straight to checkout.
        clearDraft()
        window.location.href = data.paymentUrl
      } else if (data.ok && data.reference) {
        // Rare: Paystack pre-generation returned no URL. The booking is already
        // AWAITING_PAYMENT, so the first poll immediately falls through to
        // goToPayment(), which generates a session via /api/payment/initiate.
        pollBookingStatus(data.reference, amountRands)
      } else {
        setErrorMsg(data.error ?? "Could not start your booking. Please try WhatsApp or contact us.")
        setStep("error")
      }
    } catch {
      setErrorMsg("Network error. Please try again or contact us via WhatsApp.")
      setStep("error")
    }
  }

  type StatusResponse = {
    status?: string
    bookingStatus?: string
    error?: string
    bookingRef?: string
    guestName?: string
    guestEmail?: string
    checkin?: string
    checkout?: string
    roomTypeName?: string
    paymentUrl?: string
  }

  async function goToPayment(reference: string, amountRands: number, d: StatusResponse) {
    // The status endpoint pre-generates ONE Paystack session the moment the
    // booking completes (same link it emailed the guest) — use it directly.
    // Only fall back to generating a fresh session here if that failed, so we
    // still never create two sessions for the same booking unnecessarily.
    if (d.paymentUrl) {
      clearDraft()
      window.location.href = d.paymentUrl
      return
    }
    try {
      const res = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: d.guestEmail ?? email,
          amountRands,
          bookingRef: d.bookingRef || reference,
          internalReference: reference,
          guestName: d.guestName ?? `${firstname} ${surname}`.trim(),
          guestPhone: phone,
          checkin: d.checkin ?? arrive,
          checkout: d.checkout ?? depart,
          roomTypeName: d.roomTypeName ?? roomTypeName,
        }),
      })
      const payment = (await res.json().catch(() => ({}))) as { ok?: boolean; authorization_url?: string; error?: string }
      if (payment.ok && payment.authorization_url) {
        clearDraft()
        window.location.href = payment.authorization_url
      } else {
        setErrorMsg(payment.error ?? "Your room is booked, but we couldn't start payment. Please contact us on WhatsApp.")
        setStep("error")
      }
    } catch {
      setErrorMsg("Your room is booked, but we couldn't start payment. Please contact us on WhatsApp.")
      setStep("error")
    }
  }

  function pollBookingStatus(reference: string, amountRands: number, attempt = 0) {
    const POLL_MS = 3_000
    const MAX_POLLS = 130 // ~6.5 min — the worker retries internally on ambiguous failures

    fetch(`/api/booking/status?reference=${encodeURIComponent(reference)}`, { cache: "no-store" })
      .then((res) => res.json().catch(() => ({})) as Promise<StatusResponse>)
      .then((d) => {
        if (cancelledRef.current) return
        // bookingStatus is the pipeline's single source of truth (see
        // lib/booking-status.ts) — only proceed once it's actually reached
        // AWAITING_PAYMENT (meaning the guest email step has run). Do NOT
        // also require d.paymentUrl here: the CONFIRMATION_EMAIL_SENT ->
        // AWAITING_PAYMENT transition is one-time and guarded, so if Paystack
        // pre-generation failed that one time, paymentUrl stays empty
        // forever on every future poll — requiring it here would mean
        // goToPayment() never gets called at all, so its own fallback
        // (generate a fresh session via /api/payment/initiate) never gets a
        // chance to run either. Let goToPayment handle the empty case.
        if (d.bookingStatus === "AWAITING_PAYMENT") {
          return void goToPayment(reference, amountRands, d)
        }
        if (d.bookingStatus === "FAILED" || d.status === "failed") {
          setErrorMsg(d.error || "We couldn't book this room. Please try again or contact us on WhatsApp.")
          setStep("error")
          return
        }
        // Still earlier in the pipeline (or missing/unrecognised) — keep polling.
        if (cancelledRef.current) return
        if (attempt >= MAX_POLLS) {
          setErrorMsg("This is taking longer than expected. Please contact us on WhatsApp with your details.")
          setStep("error")
          return
        }
        setTimeout(() => pollBookingStatus(reference, amountRands, attempt + 1), POLL_MS)
      })
      .catch(() => {
        if (cancelledRef.current) return
        if (attempt >= MAX_POLLS) {
          setErrorMsg("This is taking longer than expected. Please contact us on WhatsApp with your details.")
          setStep("error")
          return
        }
        setTimeout(() => pollBookingStatus(reference, amountRands, attempt + 1), POLL_MS)
      })
  }

  if (!available) return null


  // ── Paying (creating + polling the NightsBridge booking, in place) ──────
  if (step === "paying") {
    return (
      <div
        ref={panelRef}
        className="flex flex-col items-center justify-center gap-3 rounded-xl py-10"
        style={{ background: "#F7F7F6", border: "1px solid #D6D6D5" }}
      >
        <Loader2 className="size-8 animate-spin" style={{ color: "#996948" }} />
        <p className="text-sm font-medium" style={{ color: "#000000" }}>Reserving your room…</p>
        <p className="text-xs" style={{ color: "#6B6B6B" }}>
          This can take a minute or two. You&apos;ll only pay once your room is confirmed.
        </p>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (step === "error") {
    return (
      <div ref={panelRef} className="rounded-xl border border-red-200 bg-red-50 p-5">
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
            className="rounded-lg bg-[#996948] px-4 py-2 text-sm font-medium text-white hover:brightness-105"
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
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#996948] px-6 py-3.5 font-body text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:brightness-110 active:translate-y-0"
      >
        Book This Room
        <ArrowRight className="size-4" />
      </button>
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
                      ? "border-[#996948] bg-[#fdf8ef]"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="mealPlan"
                      checked={selectedPlan?.mealplanid === plan.mealplanid}
                      onChange={() => setSelectedPlan(plan)}
                      className="accent-[#996948]"
                    />
                    <MealIcon id={plan.mealplanid} />
                    <span className="font-body text-sm text-gray-800">{plan.description}</span>
                  </div>
                  <span className="font-body text-sm font-semibold text-[#996948]">
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

        {/* Payment method */}
        <div>
          <p className="mb-2 font-body text-xs font-semibold uppercase tracking-wide text-gray-500">
            Payment method
          </p>
          <div className="rounded-lg border border-[#996948] bg-[#fdf8ef] p-3">
            <span className="font-body text-sm text-gray-800">Card or EFT via Paystack</span>
            <p className="mt-0.5 font-body text-[11px] text-gray-400">
              You will be redirected to Paystack to complete payment securely after we confirm your booking.
            </p>
          </div>
          <p className="mt-2 font-body text-[11px] text-gray-400">
            Prefer to book directly?{" "}
            <a
              href={nbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#996948] underline underline-offset-2 hover:brightness-75"
            >
              Continue on NightsBridge
            </a>
          </p>
        </div>

        {/* T&Cs */}
        <label className="flex items-start gap-2 text-xs text-gray-500">
          <input type="checkbox" required className="mt-0.5 accent-[#996948]" />
          <span>
            I have read and accepted the{" "}
            <a
              href="#"
              className="text-[#996948] underline"
              onClick={(e) => e.preventDefault()}
            >
              terms and conditions
            </a>{" "}
            including the cancellation policy.
          </span>
        </label>

        {/* Cancellation note */}
        <div className="rounded-lg px-4 py-3" style={{ background: "#F7F7F6", border: "1px solid #D6D6D5" }}>
          <p className="font-body text-[11px] leading-relaxed" style={{ color: "#6B6B6B" }}>
            <strong style={{ color: "#000000" }}>Need to cancel?</strong>{" "}
            Contact us via{" "}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
              style={{ color: "#996948" }}
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
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#996948] px-6 py-3.5 font-body text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:brightness-110 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
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
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm text-gray-900 placeholder:text-gray-300 focus:border-[#996948] focus:outline-none focus:ring-1 focus:ring-[#996948]/30"

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
