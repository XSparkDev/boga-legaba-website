"use client"

import { useState } from "react"
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react"

type Fields = {
  full_name: string
  email: string
  phone: string
  home_address: string
  nationality: string
  id_or_passport: string
  date_of_birth: string
  vehicle_reg: string
  num_guests: string
  guest_names: string
  emergency_contact_name: string
  emergency_contact_phone: string
  purpose: string
}

const EMPTY: Fields = {
  full_name: "", email: "", phone: "", home_address: "", nationality: "",
  id_or_passport: "", date_of_birth: "", vehicle_reg: "", num_guests: "",
  guest_names: "", emergency_contact_name: "", emergency_contact_phone: "", purpose: "",
}

const input =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 focus:border-[#996948] focus:outline-none focus:ring-1 focus:ring-[#996948]/30"

export function RegistrationForm({ bookingRef }: { bookingRef?: string }) {
  const [f, setF] = useState<Fields>(EMPTY)
  const [ack, setAck] = useState(false)
  const [step, setStep] = useState<"form" | "saving" | "done" | "error">("form")
  const [error, setError] = useState("")

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!f.full_name.trim()) { setError("Please enter your full name."); return }
    setStep("saving"); setError("")
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...f,
          num_guests: f.num_guests ? Number(f.num_guests) : null,
          booking_ref: bookingRef || null,
          signature_ack: ack,
        }),
      })
      const data = (await res.json()) as { ok: boolean; error?: string }
      if (data.ok) setStep("done")
      else { setError(data.error ?? "Could not submit."); setStep("error") }
    } catch {
      setError("Network error. Please try again."); setStep("error")
    }
  }

  if (step === "done") {
    return (
      <div className="rounded-2xl border border-[#D6D6D5] bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto mb-3 size-10 text-emerald-500" />
        <h2 className="font-serif text-xl text-gray-900">Thank you, {f.full_name.split(" ")[0]}</h2>
        <p className="mt-2 text-sm text-gray-500">
          Your registration details have been received. We look forward to welcoming you to Boga Legaba.
        </p>
      </div>
    )
  }

  const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      {children}
      {hint && <p className="mt-0.5 text-[11px] text-gray-400">{hint}</p>}
    </div>
  )

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      {bookingRef && (
        <p className="rounded-lg bg-[#996948]/10 px-3 py-2 font-mono text-xs text-[#996948]">
          Booking reference: {bookingRef}
        </p>
      )}

      <Field label="Full name *">
        <input required value={f.full_name} onChange={set("full_name")} placeholder="Your full name" className={input} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email"><input type="email" value={f.email} onChange={set("email")} placeholder="you@email.com" className={input} /></Field>
        <Field label="Phone"><input type="tel" value={f.phone} onChange={set("phone")} placeholder="+27 82 123 4567" className={input} /></Field>
      </div>

      <Field label="Home / residential address">
        <textarea value={f.home_address} onChange={set("home_address")} rows={2} placeholder="Street, city, country" className={`${input} resize-none`} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nationality"><input value={f.nationality} onChange={set("nationality")} placeholder="e.g. South African" className={input} /></Field>
        <Field label="ID / Passport number" hint="Required for foreign guests"><input value={f.id_or_passport} onChange={set("id_or_passport")} className={input} /></Field>
        <Field label="Date of birth"><input type="date" value={f.date_of_birth} onChange={set("date_of_birth")} className={input} /></Field>
        <Field label="Vehicle registration"><input value={f.vehicle_reg} onChange={set("vehicle_reg")} placeholder="For parking / security" className={input} /></Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Number of guests"><input type="number" min="1" value={f.num_guests} onChange={set("num_guests")} className={input} /></Field>
        <Field label="Names of all guests staying"><input value={f.guest_names} onChange={set("guest_names")} placeholder="Comma-separated" className={input} /></Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Emergency contact name"><input value={f.emergency_contact_name} onChange={set("emergency_contact_name")} className={input} /></Field>
        <Field label="Emergency contact phone"><input type="tel" value={f.emergency_contact_phone} onChange={set("emergency_contact_phone")} className={input} /></Field>
      </div>

      <Field label="Purpose of visit" hint="e.g. business, government, leisure">
        <input value={f.purpose} onChange={set("purpose")} className={input} />
      </Field>

      <label className="flex items-start gap-2 text-xs text-gray-600">
        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 accent-[#996948]" />
        <span>I confirm the details above are correct and I accept the house rules.</span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={step === "saving"}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#996948] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-50"
      >
        {step === "saving" ? <><Loader2 className="size-4 animate-spin" /> Submitting…</> : <>Submit registration <ArrowRight className="size-4" /></>}
      </button>
    </form>
  )
}
