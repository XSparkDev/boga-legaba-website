"use client"

import { useState, type FormEvent } from "react"
import { CheckCircle2 } from "lucide-react"
import { Field, inputClass } from "@/components/forms/form-ui"

interface InterestFormProps {
  /** Show an "Interest Area" select (used on Dining page) */
  withInterestArea?: boolean
  interestOptions?: string[]
  submitLabel?: string
  gaEvent?: string
}

export function InterestForm({
  withInterestArea = false,
  interestOptions = [],
  submitLabel = "Register Your Interest",
  gaEvent,
}: InterestFormProps) {
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ name: "", email: "", interest: "" })

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = "Please enter your name."
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Please enter a valid email address."
    setErrors(e)
    if (Object.keys(e).length) return
    // [→ Microsoft 365 / CRM integration point]
    setSubmitted(true)
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
      <button
        type="submit"
        className="inline-flex items-center justify-center self-start rounded-full bg-gold px-7 py-3 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-[#b8943c]"
      >
        {submitLabel}
      </button>
    </form>
  )
}
