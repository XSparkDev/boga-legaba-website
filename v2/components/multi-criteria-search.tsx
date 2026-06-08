'use client'

import { useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { cn } from '@v2/lib/utils'

type MultiCriteriaSearchProps = {
  placeholder?: string
  suggestions?: string[]
  criteria: string[]
  onCriteriaChange: (criteria: string[]) => void
  matchCount?: number
  matchLabel?: string
  className?: string
}

export function MultiCriteriaSearch({
  placeholder = 'Add a filter and press Enter…',
  suggestions = [],
  criteria,
  onCriteriaChange,
  matchCount,
  matchLabel = 'meet your criteria',
  className,
}: MultiCriteriaSearchProps) {
  const [draft, setDraft] = useState('')

  function addCriterion(value: string) {
    const next = value.trim()
    if (!next) return
    const exists = criteria.some((c) => c.toLowerCase() === next.toLowerCase())
    if (!exists) onCriteriaChange([...criteria, next])
    setDraft('')
  }

  function removeCriterion(value: string) {
    onCriteriaChange(criteria.filter((c) => c !== value))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addCriterion(draft)
    }
  }

  const unusedSuggestions = suggestions.filter(
    (s) => !criteria.some((c) => c.toLowerCase() === s.toLowerCase())
  )

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-brown" />
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full rounded-xl border border-warm-sand/70 bg-off-white py-3 pl-11 pr-4 font-sans text-sm text-deep-earth placeholder:text-muted-brown/60 outline-none transition-all focus:border-terracotta focus:shadow-[0_0_0_3px_rgba(0,0,0,0.1)]"
          />
        </div>
        <button
          type="button"
          onClick={() => addCriterion(draft)}
          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-terracotta px-4 py-3 font-sans text-sm font-medium text-white transition-colors hover:bg-terracotta-light sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      {criteria.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {criteria.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1.5 rounded-full border border-deep-earth/15 bg-cream px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-body-brown"
            >
              {c}
              <button
                type="button"
                onClick={() => removeCriterion(c)}
                aria-label={`Remove filter ${c}`}
                className="rounded-full p-0.5 transition-colors hover:bg-warm-sand"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {unusedSuggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {unusedSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addCriterion(s)}
              className="rounded-full border border-warm-sand bg-off-white px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-brown transition-colors hover:border-deep-earth/20 hover:text-deep-earth"
            >
              + {s}
            </button>
          ))}
        </div>
      ) : null}

      {typeof matchCount === 'number' ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-brown">
          <span className="font-semibold text-deep-earth">{matchCount}</span> {matchLabel}
        </p>
      ) : null}
    </div>
  )
}
