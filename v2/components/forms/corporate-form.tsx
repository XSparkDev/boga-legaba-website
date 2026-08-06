'use client'

import { useEffect, useState } from 'react'
import { Field, TextInput, TextArea, Select, SuccessMessage } from './form-atoms'
import { SbdFormGenerator } from './sbd-form-generator'
import { minCheckInDate } from '@/lib/room-availability'
import { useBookingDates } from '@/hooks/useBookingDates'

export function CorporateForm() {
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [bookingType, setBookingType] = useState('')
  const [formData, setFormData] = useState({
    contact: '',
    entity: '',
    email: '',
    phone: '',
    roomsRequired: '',
    po: '',
    billing: '',
    requirements: '',
  })

  // Booking dates managed by centralized hook — guarantees checkout > checkin at all times.
  const { checkIn, checkOut, setCheckIn, setCheckOut, minCheckIn, minCheckOut } = useBookingDates()

  function updateField(key: keyof typeof formData, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    function onPerDiem() {
      setBookingType('Government Per Diem')
    }
    window.addEventListener('corporate-select-per-diem', onPerDiem)
    return () => window.removeEventListener('corporate-select-per-diem', onPerDiem)
  }, [])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const next: Record<string, string> = {}

    if (!formData.contact.trim()) next.contact = 'This field is required.'
    if (!formData.entity.trim()) next.entity = 'This field is required.'
    if (!formData.email.trim()) next.email = 'This field is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) next.email = 'Enter a valid email address.'
    if (!formData.phone.trim()) next.phone = 'This field is required.'
    if (!checkIn) next.checkin = 'This field is required.'
    else if (checkIn < minCheckInDate()) next.checkin = 'Check-in date cannot be in the past.'
    if (!checkOut) next.checkout = 'This field is required.'
    if (!formData.roomsRequired.trim()) next.roomsRequired = 'This field is required.'

    setErrors(next)
    if (Object.keys(next).length === 0) {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <SuccessMessage message="Thank you — our accounts team will be in touch shortly." />
    )
  }

  const showSbd = bookingType === 'Government Per Diem'

  const sbdFormData = {
    contact: formData.contact,
    entity: formData.entity,
    email: formData.email,
    phone: formData.phone,
    checkin: checkIn,
    checkout: checkOut,
    roomsRequired: formData.roomsRequired,
    po: formData.po,
    billing: formData.billing,
    requirements: formData.requirements,
  }

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

      {showSbd ? <SbdFormGenerator formData={sbdFormData} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Check-in Date" required error={errors.checkin}>
          <TextInput
            type="date"
            name="checkin"
            min={minCheckIn}
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
          />
        </Field>
        <Field label="Check-out Date" required error={errors.checkout}>
          <TextInput
            type="date"
            name="checkout"
            min={minCheckOut}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
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
