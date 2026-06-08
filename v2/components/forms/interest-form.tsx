'use client'

import { useState } from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Field, TextInput, Select } from './form-atoms'

export function InterestForm({
  withInterest = false,
  interestOptions = [],
  buttonLabel = 'Join the List',
  successMessage = 'Thank you — you’re on the list. We’ll be in touch.',
  inline = false,
}: {
  withInterest?: boolean
  interestOptions?: string[]
  buttonLabel?: string
  successMessage?: string
  inline?: boolean
}) {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const email = String(data.get('email') ?? '')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.')
      return
    }
    setError('')
    // [→ Microsoft 365 / CRM integration point]
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-sage/40 bg-sage/10 px-5 py-4 text-sm text-body-brown">
        <CheckCircle2 className="h-5 w-5 text-sage" />
        {successMessage}
      </div>
    )
  }

  if (inline) {
    return (
      <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <TextInput type="email" name="email" placeholder="you@email.com" aria-label="Email" />
          {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-terracotta px-6 py-3 font-sans text-sm font-medium text-white transition-colors hover:bg-terracotta-light"
        >
          {buttonLabel} <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Name">
        <TextInput name="name" placeholder="Your name" />
      </Field>
      <Field label="Email Address" error={error}>
        <TextInput type="email" name="email" placeholder="you@email.com" />
      </Field>
      {withInterest ? (
        <Field label="Interest Area">
          <Select name="interest" defaultValue="">
            <option value="" disabled>
              Select an interest
            </option>
            {interestOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <button
        type="submit"
        className="w-full rounded-xl bg-terracotta py-4 font-sans font-medium text-white transition-colors hover:bg-terracotta-light"
      >
        {buttonLabel}
      </button>
    </form>
  )
}
