'use client'

import { useMemo, useState } from 'react'
import { Reveal } from '@v2/components/reveal'
import { MultiCriteriaSearch } from '@v2/components/multi-criteria-search'
import {
  conferenceFilterSuggestions,
  conferencePackageSearchText,
  conferencePackages,
  type ConferencePackage,
} from '@v2/data/conference'
import { matchesAllCriteria } from '@v2/lib/match-criteria'
import { scrollToElement } from '@/lib/smooth-scroll'
import { cn } from '@v2/lib/utils'

const quickFilters = [
  { id: 'all', label: 'All packages' },
  { id: 'half-day', label: 'Half day' },
  { id: 'full-day', label: 'Full day' },
  { id: 'residential', label: 'Residential' },
  { id: 'accommodation', label: 'With accommodation' },
] as const

type QuickFilterId = (typeof quickFilters)[number]['id']

function matchesQuickFilter(pkg: ConferencePackage, filter: QuickFilterId) {
  if (filter === 'all') return true
  if (filter === 'accommodation') return pkg.includesAccommodation
  return pkg.duration === filter
}

export function ConferencePackages() {
  const [quickFilter, setQuickFilter] = useState<QuickFilterId>('all')
  const [criteria, setCriteria] = useState<string[]>([])

  const filtered = useMemo(() => {
    return conferencePackages.filter((pkg) => {
      if (!matchesQuickFilter(pkg, quickFilter)) return false
      return matchesAllCriteria(conferencePackageSearchText(pkg), criteria)
    })
  }, [quickFilter, criteria])

  function selectPackage(name: string) {
    scrollToElement('enquiry')
    window.dispatchEvent(new CustomEvent('conference-package-selected', { detail: { name } }))
  }

  return (
    <div>
      <Reveal>
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-terracotta">
          Packages
        </p>
        <h2 className="mt-3 font-display text-4xl font-light text-deep-earth md:text-5xl">
          Choose how you gather.
        </h2>
      </Reveal>

      <Reveal delay={80} className="mt-8 space-y-6">
        <div className="flex flex-wrap gap-2">
          {quickFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setQuickFilter(f.id)}
              className={cn(
                'rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-all',
                quickFilter === f.id
                  ? 'border-deep-earth bg-deep-earth text-white'
                  : 'border-warm-sand bg-off-white text-body-brown hover:border-deep-earth/25'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <MultiCriteriaSearch
          placeholder="Filter packages — e.g. catering, accommodation, AV…"
          suggestions={conferenceFilterSuggestions}
          criteria={criteria}
          onCriteriaChange={setCriteria}
          matchCount={filtered.length}
          matchLabel={filtered.length === 1 ? 'package meets your criteria' : 'packages meet your criteria'}
        />
      </Reveal>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {filtered.length === 0 ? (
          <Reveal className="md:col-span-3">
            <div className="rounded-2xl border border-dashed border-warm-sand bg-cream px-6 py-12 text-center">
              <p className="font-display text-xl italic text-deep-earth">No packages match these filters.</p>
              <p className="mt-2 text-sm text-muted-brown">Try removing a filter or choose &ldquo;All packages&rdquo;.</p>
            </div>
          </Reveal>
        ) : (
          filtered.map((p, i) => (
            <Reveal key={p.id} delay={i * 100}>
              <div className="flex h-full flex-col rounded-2xl bg-cream p-7 shadow-[0_4px_24px_rgba(44,26,14,0.08)]">
                <div className="pattern-stripe mb-5 w-12 rounded-full" />
                <h3 className="font-display text-2xl italic text-deep-earth">{p.name}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-body-brown">{p.desc}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.includesAv ? (
                    <span className="rounded-full bg-warm-sand px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-body-brown">
                      AV
                    </span>
                  ) : null}
                  {p.includesCatering ? (
                    <span className="rounded-full bg-warm-sand px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-body-brown">
                      Catering
                    </span>
                  ) : null}
                  {p.includesAccommodation ? (
                    <span className="rounded-full bg-warm-sand px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-body-brown">
                      Accommodation
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => selectPackage(p.name)}
                  className="mt-6 inline-block rounded-full border border-terracotta px-5 py-2.5 text-sm font-medium text-terracotta transition-colors hover:bg-terracotta hover:text-white"
                >
                  Request Quote
                </button>
              </div>
            </Reveal>
          ))
        )}
      </div>
    </div>
  )
}
