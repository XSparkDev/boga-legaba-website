import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export const inputClass =
  "w-full min-w-0 rounded-lg border border-border bg-card px-4 py-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-gold focus:ring-2 focus:ring-gold/30"

export function Field({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string
  required?: boolean
  error?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      {children}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  )
}

export function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 text-sm transition-colors hover:border-gold/50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-gold"
      />
      <span className="text-foreground">{label}</span>
    </label>
  )
}
