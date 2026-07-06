"use client"

import { useMemo, useState } from "react"
import { Reveal } from "@/components/reveal"
import { MultiCriteriaSearch } from "@/components/search/multi-criteria-search"
import {
  CONFERENCE_SEARCH_SUGGESTIONS,
  CONFERENCE_OFFERINGS,
  type ConferenceOffering,
} from "@/data/conference"
import { matchesAllCriteria } from "@/lib/match-criteria"
import { scrollToElement } from "@/lib/smooth-scroll"
import { cn } from "@/lib/utils"

const quickFilters = [
  { id: "all", label: "All packages" },
  { id: "half-day", label: "Half day" },
  { id: "full-day", label: "Full day" },
  { id: "residential", label: "Residential" },
  { id: "accommodation", label: "With accommodation" },
] as const

type QuickFilterId = (typeof quickFilters)[number]["id"]

const packages = CONFERENCE_OFFERINGS.filter((o) => o.kind === "package")

function packageSearchText(pkg: ConferenceOffering) {
  return [
    pkg.name,
    pkg.summary,
    pkg.packageType,
    pkg.accommodation ? "accommodation residential overnight" : "",
    ...pkg.av,
    ...pkg.catering,
    ...pkg.setups,
    ...(pkg.highlights ?? []),
    `${pkg.capacityMax} delegates`,
  ].join(" ")
}

function matchesQuickFilter(pkg: ConferenceOffering, filter: QuickFilterId) {
  if (filter === "all") return true
  if (filter === "accommodation") return pkg.accommodation
  if (filter === "half-day") return pkg.packageType === "Half Day"
  if (filter === "full-day") return pkg.packageType === "Full Day"
  if (filter === "residential") return pkg.packageType === "Residential"
  return true
}

export function ConferencePackages() {
  const [quickFilter, setQuickFilter] = useState<QuickFilterId>("all")
  const [criteria, setCriteria] = useState<string[]>([])

  const filtered = useMemo(() => {
    return packages.filter((pkg) => {
      if (!matchesQuickFilter(pkg, quickFilter)) return false
      return matchesAllCriteria(packageSearchText(pkg), criteria)
    })
  }, [quickFilter, criteria])

  function selectPackage(name: string) {
    scrollToElement("conference-enquiry")
    window.dispatchEvent(new CustomEvent("conference-package-selected", { detail: { name } }))
  }

  return (
    <section className="border-y border-border bg-[#F7F7F6]/60 py-14 lg:py-20" aria-labelledby="conference-packages-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold">Packages</p>
          <h2 id="conference-packages-heading" className="mt-2 font-serif text-3xl text-foreground sm:text-4xl">
            Find what meets your criteria
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Filter by package type, catering, AV, or accommodation — each filter narrows the results.
          </p>
        </Reveal>

        <Reveal delay={80} className="mt-8 space-y-6">
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setQuickFilter(f.id)}
                className={cn(
                  "rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-all",
                  quickFilter === f.id
                    ? "border-[#000000] bg-[#000000] text-white"
                    : "border-border bg-card text-muted-foreground hover:border-foreground/25",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <MultiCriteriaSearch
            placeholder="Filter packages — e.g. catering, accommodation, AV, lunch…"
            suggestions={CONFERENCE_SEARCH_SUGGESTIONS}
            criteria={criteria}
            onCriteriaChange={setCriteria}
            matchCount={filtered.length}
            matchLabel={
              filtered.length === 1 ? "package meets your criteria" : "packages meet your criteria"
            }
          />
        </Reveal>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {filtered.length === 0 ? (
            <Reveal className="lg:col-span-3">
              <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
                <p className="font-serif text-xl text-foreground">No packages match these filters.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try removing a filter or choose &ldquo;All packages&rdquo;.
                </p>
              </div>
            </Reveal>
          ) : (
            filtered.map((pkg, i) => (
              <Reveal as="article" key={pkg.id} delay={i * 90}>
                <div
                  className={cn(
                    "flex h-full flex-col rounded-2xl border p-7",
                    pkg.featured ? "border-gold bg-[#000000] text-white" : "border-border bg-card",
                  )}
                >
                  <h3 className={cn("font-serif text-2xl", pkg.featured ? "text-white" : "text-foreground")}>
                    {pkg.name}
                  </h3>
                  <p className={cn("mt-1 font-mono text-sm", pkg.featured ? "text-gold" : "text-muted-foreground")}>
                    {pkg.priceLabel}
                  </p>
                  <p className={cn("mt-3 flex-1 text-sm leading-relaxed", pkg.featured ? "text-white/75" : "text-muted-foreground")}>
                    {pkg.summary}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {pkg.av.length > 0 ? (
                      <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[10px] text-gold">AV</span>
                    ) : null}
                    {pkg.catering.length > 0 ? (
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[10px]", pkg.featured ? "bg-white/10 text-white/80" : "bg-secondary text-muted-foreground")}>
                        Catering
                      </span>
                    ) : null}
                    {pkg.accommodation ? (
                      <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[10px] text-gold">Accommodation</span>
                    ) : null}
                  </div>
                  {pkg.highlights ? (
                    <ul className="mt-4 flex flex-col gap-2 border-t border-black/5 pt-4 text-xs">
                      {pkg.highlights.map((item) => (
                        <li key={item} className={cn("flex items-center gap-2", pkg.featured ? "text-white/70" : "text-muted-foreground")}>
                          <span className="size-1.5 rounded-full bg-gold" aria-hidden />
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => selectPackage(pkg.name)}
                    className={cn(
                      "mt-6 inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-medium transition-colors",
                      pkg.featured
                        ? "border-gold text-gold hover:bg-gold hover:text-[#000000]"
                        : "border-gold/50 text-foreground hover:bg-gold hover:text-[#000000]",
                    )}
                  >
                    Request Quote
                  </button>
                </div>
              </Reveal>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
