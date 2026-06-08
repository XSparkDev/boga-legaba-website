"use client"

import { useState } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MultiCriteriaSearchProps {
  criteria: string[]
  onCriteriaChange: (criteria: string[]) => void
  suggestions?: string[]
  placeholder?: string
  className?: string
  matchCount?: number
  matchLabel?: string
}

export function MultiCriteriaSearch({
  criteria,
  onCriteriaChange,
  suggestions = [],
  placeholder = "Add a filter and press Enter…",
  className,
  matchCount,
  matchLabel = "meet your criteria",
}: MultiCriteriaSearchProps) {
  const [draft, setDraft] = useState("")

  function addCriterion(value: string) {
    const next = value.trim()
    if (!next) return
    const exists = criteria.some((c) => c.toLowerCase() === next.toLowerCase())
    if (!exists) onCriteriaChange([...criteria, next])
    setDraft("")
  }

  function removeCriterion(value: string) {
    onCriteriaChange(criteria.filter((c) => c.toLowerCase() !== value.toLowerCase()))
  }

  function clearAll() {
    onCriteriaChange([])
    setDraft("")
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      addCriterion(draft)
    }
  }

  const uniqueSuggestions = suggestions.filter(
    (s, index, all) => all.findIndex((item) => item.toLowerCase() === s.toLowerCase()) === index,
  )

  const unusedSuggestions = uniqueSuggestions.filter(
    (s) => !criteria.some((c) => c.toLowerCase() === s.toLowerCase()),
  )

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-gold focus:ring-2 focus:ring-gold/20"
          />
        </div>
        <button
          type="button"
          onClick={() => addCriterion(draft)}
          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-gold-hover sm:w-auto"
        >
          <Search className="size-4" />
          <span>Search</span>
        </button>
      </div>

      {criteria.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {criteria.map((c, index) => (
            <span
              key={`${c}-${index}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-gold bg-gold px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-[#0A0A0A]"
            >
              {c}
              <button
                type="button"
                onClick={() => removeCriterion(c)}
                aria-label={`Remove filter ${c}`}
                className="rounded-full p-0.5 transition-colors hover:bg-black/10"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="rounded-full border border-border bg-card px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-gold/40 hover:text-foreground"
          >
            Clear
          </button>
        </div>
      ) : null}

      {unusedSuggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {unusedSuggestions.map((s, index) => (
            <button
              key={`${s}-${index}`}
              type="button"
              onClick={() => addCriterion(s)}
              className="rounded-full border border-border bg-card px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-gold/40 hover:text-foreground"
            >
              + {s}
            </button>
          ))}
        </div>
      ) : null}

      {typeof matchCount === "number" ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <span className="font-semibold text-gold">{matchCount}</span> {matchLabel}
        </p>
      ) : null}
    </div>
  )
}
