'use client'

import { useState } from 'react'
import { Field, TextInput, TextArea, Select, SuccessMessage } from './form-atoms'
import { SbdFormGenerator } from './sbd-form-generator'

export function CorporateForm() {
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [bookingType, setBookingType] = useState('')
  const [formData, setFormData] = useState({
    contact: '',
    entity: '',
    email: '',
    phone: '',
    checkin: '',
    checkout: '',
    roomsRequired: '',
    po: '',
    billing: '',
    requirements: '',
  })

  function updateField(key: keyof typeof formData, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const required = ['contact', 'entity', 'email', 'phone', 'checkin', 'checkout', 'roomsRequired']
    const next: Record<string, string> = {}
    required.forEach((key) => {
      if (!String(data.get(key) ?? '').trim()) next[key] = 'This field is required.'
    })
    const email = String(data.get('email') ?? '')
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address.'
    setErrors(next)
    if (Object.keys(next).length === 0) {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <SuccessMessage message="Thank you — our accounts team will respond within 2 business hours." />
    )
  }

  const showSbd = bookingType === 'Government Per Diem'

  return (
    <form onSubmit={handleSubmit} data-ga4-event="corporate_enquiry_submit" noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Contact Person" required error={errors.contact}>
          <TextInput
            name="contact"
            placeholder="Jane Mokoena"
            value={formData.contact}
            onChange={(e) => updateField('contact', e.target.value)}
          />
        </Field>
        <Field label="Company / Department / Entity" required error={errors.entity}>
          <TextInput
            name="entity"
            placeholder="Provincial Treasury"
            value={formData.entity}
            onChange={(e) => updateField('entity', e.target.value)}
          />
        </Field>
        <Field label="Email Address" required error={errors.email}>
          <TextInput
            type="email"
            name="email"
            placeholder="jane@entity.gov.za"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
          />
        </Field>
        <Field label="Phone Number" required error={errors.phone}>
          <TextInput
            type="tel"
            name="phone"
            placeholder="+27 ..."
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
          />
        </Field>
      </div>

      <Field label="Booking Type">
        <Select
          name="bookingType"
          value={bookingType}
          onChange={(e) => setBookingType(e.target.value)}
        >
          <option value="" disabled>
            Select a booking type
          </option>
          {['Corporate Individual', 'Government Per Diem', 'Block Booking', 'Corporate Event'].map(
            (o) => (
              <option key={o} value={o}>
                {o}
              </option>
            )
          )}
        </Select>
      </Field>

      {showSbd ? <SbdFormGenerator formData={formData} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Check-in Date" required error={errors.checkin}>
          <TextInput
            type="date"
            name="checkin"
            value={formData.checkin}
            onChange={(e) => updateField('checkin', e.target.value)}
          />
        </Field>
        <Field label="Check-out Date" required error={errors.checkout}>
          <TextInput
            type="date"
            name="checkout"
            value={formData.checkout}
            onChange={(e) => updateField('checkout', e.target.value)}
          />
        </Field>
        <Field label="Number of Rooms Required" required error={errors.roomsRequired}>
          <TextInput
            type="number"
            min={1}
            name="roomsRequired"
            placeholder="5"
            value={formData.roomsRequired}
            onChange={(e) => updateField('roomsRequired', e.target.value)}
          />
        </Field>
        <Field label="PO Number (if applicable)">
          <TextInput
            name="po"
            placeholder="PO-2026-001"
            value={formData.po}
            onChange={(e) => updateField('po', e.target.value)}
          />
        </Field>
      </div>

      <Field label="Billing Contact (if different)">
        <TextInput
          name="billing"
          placeholder="accounts@entity.gov.za"
          value={formData.billing}
          onChange={(e) => updateField('billing', e.target.value)}
        />
      </Field>

      <Field label="Special Requirements">
        <TextArea
          name="requirements"
          placeholder="Tell us about your booking needs…"
          value={formData.requirements}
          onChange={(e) => updateField('requirements', e.target.value)}
        />
      </Field>

      <button
        type="submit"
        className="w-full rounded-xl bg-terracotta py-4 font-sans font-medium text-white transition-colors hover:bg-terracotta-light"
      >
        Submit Corporate Enquiry
      </button>
    </form>
  )
}
