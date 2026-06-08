'use client'

import { CheckCircle2 } from 'lucide-react'
import { cn } from '@v2/lib/utils'

const baseInput =
  'w-full rounded-xl border border-warm-sand/70 bg-off-white px-4 py-3 font-sans text-sm text-deep-earth placeholder:text-muted-brown/60 outline-none transition-all focus:border-terracotta focus:shadow-[0_0_0_3px_rgba(0,0,0,0.1)]'

export function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="group transition-transform duration-200 focus-within:-translate-y-0.5">
      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.15em] text-body-brown">
        {label}
        {required ? <span className="text-terracotta"> *</span> : null}
      </label>
      <div className="border-l-2 border-transparent pl-0 transition-colors group-focus-within:border-terracotta group-focus-within:pl-3">
        {children}
      </div>
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
    </div>
  )
}

export function TextInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(baseInput, className)} {...props} />
}

export function TextArea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(baseInput, 'min-h-[110px] resize-y', className)} {...props} />
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(baseInput, 'appearance-none', className)} {...props}>
      {children}
    </select>
  )
}

export function CheckGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isOn = selected.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={cn(
              'rounded-full border px-3.5 py-2 font-sans text-xs transition-all',
              isOn
                ? 'border-terracotta bg-terracotta text-white'
                : 'border-warm-sand bg-off-white text-body-brown hover:border-terracotta'
            )}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

export function SuccessMessage({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-sage/30 bg-sage/10 px-6 py-12 text-center">
      <CheckCircle2 className="h-12 w-12 text-sage" />
      <p className="mt-4 max-w-md font-display text-xl italic text-deep-earth">{message}</p>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-brown">
        [ → Microsoft 365 / CRM integration point ]
      </p>
    </div>
  )
}
