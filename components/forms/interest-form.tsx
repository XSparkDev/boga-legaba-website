"use client"

import { useState, type FormEvent } from "react"
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react"
import { Field, inputClass } from "@/components/forms/form-ui"

interface InterestFormProps {
  /** Show an "Interest Area" select (used on Dining page) */
  withInterestArea?: boolean
  interestOptions?: string[]
  submitLabel?: string
  gaEvent?: string
  /** Which page this form is on (e.g. "Specials", "Dining") — included in the staff email */
  source?: string
}

export function InterestForm({
  withInterestArea = false,
  interestOptions = [],
  submitLabel = "Register Your Interest",
  gaEvent,
  source,
}: InterestFormProps) {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ name: "", email: "", interest: "" })

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = "Please enter your name."
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Please enter a valid email address."
    setErrors(e)
    if (Object.keys(e).length) return

    setSubmitting(true)
    setSubmitError("")
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "interest",
          name: form.name,
          email: form.email,
          details: { interest: form.interest || undefined, source },
        }),
      })
      const data = (await res.json()) as { ok: boolean; error?: string }
      if (data.ok) {
        setSubmitted(true)
      } else {
        setSubmitError(data.error ?? "Could not submit. Please try again.")
      }
    } catch {
      setSubmitError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-gold/40 bg-gold/10 p-5">
        <CheckCircle2 className="size-6 shrink-0 text-gold" />
        <p className="text-sm leading-relaxed text-foreground">
          Thank you — you&apos;re on the list. We&apos;ll be in touch with updates.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} data-ga4-event={gaEvent} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required error={errors.name}>
          <input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Email" required error={errors.email}>
          <input type="email" className={inputClass} value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
      </div>
      {withInterestArea ? (
        <Field label="Interest Area">
          <select className={inputClass} value={form.interest} onChange={(e) => set("interest", e.target.value)}>
            <option value="">Select an area…</option>
            {interestOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      {submitError ? (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" /> {submitError}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-gold px-7 py-3 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-[#b8943c] disabled:opacity-60"
      >
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        {submitting ? "Sending…" : submitLabel}
      </button>
    </form>
  )
}
