"use client"

import { useState, type FormEvent } from "react"
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react"
import { Field, CheckboxRow, inputClass } from "@/components/forms/form-ui"
import { CONFERENCE_AV, CONFERENCE_CATERING, CONFERENCE_SETUPS } from "@/data/conference"

export function ConferenceForm() {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [accommodation, setAccommodation] = useState(false)
  const [av, setAv] = useState<string[]>([])
  const [catering, setCatering] = useState<string[]>([])
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    dates: "",
    attendees: "",
    setup: "",
    rooms: "",
    notes: "",
  })

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const toggle = (list: string[], setList: (v: string[]) => void, val: string) =>
    setList(list.includes(val) ? list.filter((x) => x !== val) : [...list, val])

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = "Please enter your full name."
    if (!form.company.trim()) e.company = "Please enter your company or organisation."
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Please enter a valid email address."
    if (!form.phone.trim()) e.phone = "Please enter a phone number."
    if (!form.dates.trim()) e.dates = "Please indicate your preferred date(s)."
    if (!form.attendees.trim()) e.attendees = "Please enter the number of attendees."
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setSubmitError("")
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "conference",
          name: form.name,
          email: form.email,
          phone: form.phone,
          entity: form.company,
          message: form.notes,
          details: {
            dates: form.dates,
            attendees: form.attendees,
            setup: form.setup,
            av,
            catering,
            accommodation,
            rooms: form.rooms,
          },
        }),
      })
      const data = (await res.json()) as { ok: boolean; error?: string }
      if (data.ok) {
        setSubmitted(true)
      } else {
        setSubmitError(data.error ?? "Could not send your enquiry. Please try again.")
      }
    } catch {
      setSubmitError("Network error. Please try again or contact us via WhatsApp.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-gold/40 bg-gold/10 p-10 text-center">
        <CheckCircle2 className="size-12 text-gold" />
        <h3 className="font-serif text-2xl text-foreground">Thank you — enquiry received.</h3>
        <p className="max-w-md text-pretty leading-relaxed text-muted-foreground">
          Our conference team will respond within 2 business hours.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      data-ga4-event="conference_enquiry_submit"
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 sm:p-8"
      noValidate
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full Name" required error={errors.name}>
          <input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Company / Organisation" required error={errors.company}>
          <input className={inputClass} value={form.company} onChange={(e) => set("company", e.target.value)} />
        </Field>
        <Field label="Email Address" required error={errors.email}>
          <input type="email" className={inputClass} value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Phone Number" required error={errors.phone}>
          <input type="tel" className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Preferred Date(s)" required error={errors.dates}>
          <input
            className={inputClass}
            placeholder="e.g. 12–13 March 2026"
            value={form.dates}
            onChange={(e) => set("dates", e.target.value)}
          />
        </Field>
        <Field label="Number of Attendees" required error={errors.attendees}>
          <input
            type="number"
            min={1}
            className={inputClass}
            value={form.attendees}
            onChange={(e) => set("attendees", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Conference Setup">
        <select className={inputClass} value={form.setup} onChange={(e) => set("setup", e.target.value)}>
          <option value="">Select a setup style…</option>
          {CONFERENCE_SETUPS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>

      <Field label="AV Requirements">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CONFERENCE_AV.map((o) => (
            <CheckboxRow key={o} label={o} checked={av.includes(o)} onChange={() => toggle(av, setAv, o)} />
          ))}
        </div>
      </Field>

      <Field label="Catering Requirements">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CONFERENCE_CATERING.map((o) => (
            <CheckboxRow
              key={o}
              label={o}
              checked={catering.includes(o)}
              onChange={() => toggle(catering, setCatering, o)}
            />
          ))}
        </div>
      </Field>

      <Field label="Accommodation Required?">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAccommodation(false)}
            className={`rounded-full border px-5 py-2 text-sm font-medium transition-colors ${!accommodation ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"}`}
          >
            No
          </button>
          <button
            type="button"
            onClick={() => setAccommodation(true)}
            className={`rounded-full border px-5 py-2 text-sm font-medium transition-colors ${accommodation ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"}`}
          >
            Yes
          </button>
        </div>
      </Field>

      {accommodation ? (
        <Field label="Number of Rooms Required">
          <input
            type="number"
            min={1}
            className={inputClass}
            value={form.rooms}
            onChange={(e) => set("rooms", e.target.value)}
          />
        </Field>
      ) : null}

      <Field label="Additional Notes">
        <textarea
          rows={4}
          className={inputClass}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </Field>

      {submitError ? (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" /> {submitError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-[#000000] transition-colors hover:bg-[#b8943c] disabled:opacity-60"
      >
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        {submitting ? "Sending…" : "Send Conference Enquiry"}
      </button>
      <p className="text-center text-xs text-muted-foreground">
        Our conference team will respond within 2 business hours.
      </p>
    </form>
  )
}
