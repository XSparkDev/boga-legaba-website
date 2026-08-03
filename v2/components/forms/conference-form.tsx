'use client'

import { useEffect, useState } from 'react'
import { Field, TextInput, TextArea, Select, CheckGroup, SuccessMessage } from './form-atoms'

const avOptions = ['Projector', 'Screen', 'Microphone', 'PA System', 'Video Conferencing']
const cateringOptions = ['Morning Tea', 'Lunch', 'Afternoon Tea', 'Dinner', 'Full Day Package']

export function ConferenceForm() {
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [av, setAv] = useState<string[]>([])
  const [catering, setCatering] = useState<string[]>([])
  const [accommodation, setAccommodation] = useState<'yes' | 'no'>('no')
  const [packageNote, setPackageNote] = useState('')

  useEffect(() => {
    function onPackageSelected(e: Event) {
      const name = (e as CustomEvent<{ name: string }>).detail?.name
      if (!name) return
      setPackageNote(`Interested in the ${name} package.`)
      if (name === 'Residential') setAccommodation('yes')
    }
    window.addEventListener('conference-package-selected', onPackageSelected)
    return () => window.removeEventListener('conference-package-selected', onPackageSelected)
  }, [])

  const toggle = (list: string[], set: (v: string[]) => void) => (value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const required = ['fullName', 'company', 'email', 'phone', 'dates', 'attendees']
    const next: Record<string, string> = {}
    required.forEach((key) => {
      if (!String(data.get(key) ?? '').trim()) next[key] = 'This field is required.'
    })
    const email = String(data.get('email') ?? '')
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address.'
    setErrors(next)
    if (Object.keys(next).length === 0) {
      // [→ Microsoft 365 / CRM integration point]
      setSubmitted(true)
      window.scrollTo({ top: window.scrollY, behavior: 'smooth' })
    }
  }

  if (submitted) {
    return (
      <SuccessMessage message="Thank you — our conference team will be in touch shortly." />
    )
  }

  return (
    <form onSubmit={handleSubmit} data-ga4-event="conference_enquiry_submit" noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full Name" required error={errors.fullName}>
          <TextInput name="fullName" placeholder="Jane Mokoena" />
        </Field>
        <Field label="Company / Organisation" required error={errors.company}>
          <TextInput name="company" placeholder="Department of Health" />
        </Field>
        <Field label="Email Address" required error={errors.email}>
          <TextInput type="email" name="email" placeholder="jane@dept.gov.za" />
        </Field>
        <Field label="Phone Number" required error={errors.phone}>
          <TextInput type="tel" name="phone" placeholder="+27 ..." />
        </Field>
        <Field label="Preferred Date(s)" required error={errors.dates}>
          <TextInput name="dates" placeholder="e.g. 14–15 March 2026" />
        </Field>
        <Field label="Number of Attendees" required error={errors.attendees}>
          <TextInput type="number" min={1} name="attendees" placeholder="40" />
        </Field>
      </div>

      <Field label="Conference Setup">
        <Select name="setup" defaultValue="">
          <option value="" disabled>
            Select a layout
          </option>
          {['Theatre', 'Boardroom', 'U-Shape', 'Classroom', 'Cocktail'].map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="AV Requirements">
        <CheckGroup options={avOptions} selected={av} onToggle={toggle(av, setAv)} />
      </Field>

      <Field label="Catering Requirements">
        <CheckGroup options={cateringOptions} selected={catering} onToggle={toggle(catering, setCatering)} />
      </Field>

      <Field label="Accommodation Required?">
        <div className="flex gap-2">
          {(['no', 'yes'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAccommodation(v)}
              className={
                'rounded-full border px-5 py-2 text-sm capitalize transition-all ' +
                (accommodation === v
                  ? 'border-terracotta bg-terracotta text-white'
                  : 'border-warm-sand bg-off-white text-body-brown')
              }
            >
              {v}
            </button>
          ))}
        </div>
      </Field>

      {accommodation === 'yes' ? (
        <Field label="Rooms Required">
          <TextInput type="number" min={1} name="rooms" placeholder="10" />
        </Field>
      ) : null}

      <Field label="Additional Notes">
        <TextArea
          name="notes"
          value={packageNote}
          onChange={(e) => setPackageNote(e.target.value)}
          placeholder="Tell us anything else about your event…"
        />
      </Field>

      <button
        type="submit"
        className="w-full rounded-xl bg-terracotta py-4 font-sans font-medium text-white transition-colors hover:bg-terracotta-light"
      >
        Send Enquiry
      </button>
    </form>
  )
}
