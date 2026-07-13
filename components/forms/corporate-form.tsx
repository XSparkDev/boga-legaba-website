"use client"

import { useEffect, useState, type FormEvent } from "react"
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react"
import { SbdFormGenerator } from "@/components/forms/sbd-form-generator"
import { Field, inputClass } from "@/components/forms/form-ui"

const BOOKING_TYPES = ["Corporate Individual", "Government Per Diem", "Block Booking", "Corporate Event"]

export function CorporateForm() {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    contact: "",
    entity: "",
    email: "",
    phone: "",
    type: "",
    checkin: "",
    checkout: "",
    rooms: "",
    po: "",
    billing: "",
    requirements: "",
  })

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    function onPerDiem() {
      setForm((f) => ({ ...f, type: "Government Per Diem" }))
    }
    window.addEventListener("corporate-select-per-diem", onPerDiem)
    return () => window.removeEventListener("corporate-select-per-diem", onPerDiem)
  }, [])

  function validate() {
    const e: Record<string, string> = {}
    if (!form.contact.trim()) e.contact = "Please enter a contact person."
    if (!form.entity.trim()) e.entity = "Please enter your company, department or entity."
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Please enter a valid email address."
    if (!form.phone.trim()) e.phone = "Please enter a phone number."
    if (!form.checkin) e.checkin = "Please select a check-in date."
    if (!form.checkout) e.checkout = "Please select a check-out date."
    if (!form.rooms.trim()) e.rooms = "Please enter the number of rooms required."
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
          type: "corporate",
          name: form.contact,
          email: form.email,
          phone: form.phone,
          entity: form.entity,
          message: form.requirements,
          details: {
            type: form.type,
            checkin: form.checkin,
            checkout: form.checkout,
            rooms: form.rooms,
            po: form.po,
            billing: form.billing,
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
        <h3 className="font-serif text-2xl text-foreground">Thank you, enquiry received.</h3>
        <p className="max-w-md text-pretty leading-relaxed text-muted-foreground">
          Our team will respond within 2 business hours with rates and availability.
        </p>
      </div>
    )
  }

  const showSbd = form.type === "Government Per Diem"

  const sbdFormData = {
    contact: form.contact,
    entity: form.entity,
    email: form.email,
    phone: form.phone,
    checkin: form.checkin,
    checkout: form.checkout,
    roomsRequired: form.rooms,
    po: form.po,
    billing: form.billing,
    requirements: form.requirements,
  }

  return (
    <form
      onSubmit={onSubmit}
      data-ga4-event="corporate_enquiry_submit"
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 sm:p-8"
      noValidate
    >
      <Field label="Contact Person" required error={errors.contact}>
        <input className={inputClass} value={form.contact} onChange={(e) => set("contact", e.target.value)} />
      </Field>
      <Field label="Company / Department / Government Entity" required error={errors.entity}>
        <input className={inputClass} value={form.entity} onChange={(e) => set("entity", e.target.value)} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email Address" required error={errors.email}>
          <input type="email" className={inputClass} value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Phone Number" required error={errors.phone}>
          <input type="tel" className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
      </div>
      <Field label="Booking Type">
        <select className={inputClass} value={form.type} onChange={(e) => set("type", e.target.value)}>
          <option value="">Select booking type…</option>
          {BOOKING_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>

      {showSbd ? <SbdFormGenerator formData={sbdFormData} /> : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Check-in Date" required error={errors.checkin}>
          <input type="date" className={inputClass} value={form.checkin} onChange={(e) => set("checkin", e.target.value)} />
        </Field>
        <Field label="Check-out Date" required error={errors.checkout}>
          <input type="date" className={inputClass} value={form.checkout} onChange={(e) => set("checkout", e.target.value)} />
        </Field>
        <Field label="Rooms Required" required error={errors.rooms}>
          <input type="number" min={1} className={inputClass} value={form.rooms} onChange={(e) => set("rooms", e.target.value)} />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="PO Number (if applicable)">
          <input className={inputClass} value={form.po} onChange={(e) => set("po", e.target.value)} />
        </Field>
        <Field label="Billing Contact (if different)">
          <input className={inputClass} value={form.billing} onChange={(e) => set("billing", e.target.value)} />
        </Field>
      </div>
      <Field label="Special Requirements">
        <textarea rows={4} className={inputClass} value={form.requirements} onChange={(e) => set("requirements", e.target.value)} />
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
        {submitting ? "Sending…" : "Submit Corporate Enquiry"}
      </button>
      <p className="text-center text-xs text-muted-foreground">Our team will respond within 2 business hours.</p>
    </form>
  )
}
