"use client"

import { useState, type FormEvent } from "react"
import { CheckCircle2 } from "lucide-react"
import { Field, inputClass } from "@/components/forms/form-ui"

const SUBJECTS = ["General Enquiry", "Booking", "Conference", "Corporate / Government", "Accounts", "Other"]

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" })

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = "Please enter your name."
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Please enter a valid email address."
    if (!form.message.trim()) e.message = "Please enter a message."
    setErrors(e)
    if (Object.keys(e).length) return
    // [→ Microsoft 365 / CRM integration point]
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-gold/40 bg-gold/10 p-10 text-center">
        <CheckCircle2 className="size-12 text-gold" />
        <h3 className="font-serif text-2xl text-foreground">Message sent — thank you.</h3>
        <p className="max-w-md text-pretty leading-relaxed text-muted-foreground">
          We&apos;ll get back to you as soon as possible.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 sm:p-8" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" required error={errors.name}>
          <input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Email" required error={errors.email}>
          <input type="email" className={inputClass} value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Phone">
          <input type="tel" className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Subject">
          <select className={inputClass} value={form.subject} onChange={(e) => set("subject", e.target.value)}>
            <option value="">Select a subject…</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Message" required error={errors.message}>
        <textarea rows={5} className={inputClass} value={form.message} onChange={(e) => set("message", e.target.value)} />
      </Field>
      <button
        type="submit"
        className="inline-flex items-center justify-center self-start rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-[#b8943c]"
      >
        Send Message
      </button>
    </form>
  )
}
