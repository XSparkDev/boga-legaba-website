"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowDown, ChevronLeft, ChevronRight, X } from "lucide-react"
import { Reveal } from "@/components/reveal"
import { SiteImage } from "@/components/site-image"
import { MultiCriteriaSearch } from "@/components/search/multi-criteria-search"
import {
  galleryCategories,
  galleryFilterSuggestions,
  galleryItemSearchText,
  getGalleryBrowserItems,
  type GalleryCategory,
} from "@/data/gallery-browser"
import { matchesAllCriteria } from "@/lib/match-criteria"
import { cn } from "@/lib/utils"

export function GalleryGrid() {
  const items = useMemo(() => getGalleryBrowserItems(), [])
  const [category, setCategory] = useState<GalleryCategory>("All")
  const [criteria, setCriteria] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (category !== "All" && item.category !== category) return false
      return matchesAllCriteria(galleryItemSearchText(item), criteria)
    })
  }, [items, category, criteria])

  useEffect(() => {
    setLightboxIndex(null)
  }, [category, criteria])

  useEffect(() => {
    if (lightboxIndex !== null && lightboxIndex >= filtered.length) {
      setLightboxIndex(filtered.length > 0 ? filtered.length - 1 : null)
    }
  }, [lightboxIndex, filtered.length])

  const active = lightboxIndex !== null ? filtered[lightboxIndex] : null

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= filtered.length) return
      setLightboxIndex(index)
    },
    [filtered.length],
  )

  const close = useCallback(() => setLightboxIndex(null), [])

  useEffect(() => {
    if (lightboxIndex === null) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close()
      if (e.key === "ArrowLeft") goTo(lightboxIndex - 1)
      if (e.key === "ArrowRight") goTo(lightboxIndex + 1)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [lightboxIndex, close, goTo])

  return (
    <div>
      <Reveal className="mb-8 flex flex-col items-center gap-3 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          Browse the portfolio
        </p>
        <ArrowDown className="size-5 animate-bounce text-gold" aria-hidden />
      </Reveal>

      <Reveal delay={60} className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {galleryCategories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                category === c
                  ? "border-transparent bg-[#0a0a0a] text-white"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/30",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <MultiCriteriaSearch
          placeholder="Add filters — room name, property, conference, dining…"
          suggestions={galleryFilterSuggestions}
          criteria={criteria}
          onCriteriaChange={setCriteria}
          matchCount={filtered.length}
          matchLabel={filtered.length === 1 ? "photo meets your criteria" : "photos meet your criteria"}
        />
      </Reveal>

      {filtered.length === 0 ? (
        <Reveal className="mt-10">
          <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <p className="font-serif text-xl text-foreground">No photos match these filters.</p>
          </div>
        </Reveal>
      ) : (
        <Reveal delay={100} className="mt-8 grid auto-rows-[200px] grid-cols-2 gap-4 lg:grid-cols-4">
          {filtered.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setLightboxIndex(index)}
              className={cn(
                "group relative overflow-hidden rounded-xl transition-opacity duration-300",
                item.span && "sm:row-span-2",
              )}
              aria-label={`View ${item.label}`}
            >
              <SiteImage
                src={item.url}
                alt={`${item.label} — ${item.alt}`}
                className="h-full min-h-[200px] transition-transform duration-500 group-hover:scale-105"
              />
            </button>
          ))}
        </Reveal>
      )}

      {active && lightboxIndex !== null ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={active.label}
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-5 top-5 inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="size-5" />
          </button>

          {lightboxIndex > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                goTo(lightboxIndex - 1)
              }}
              aria-label="Previous image"
              className="absolute left-4 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 sm:left-6"
            >
              <ChevronLeft className="size-6" />
            </button>
          ) : null}

          {lightboxIndex < filtered.length - 1 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                goTo(lightboxIndex + 1)
              }}
              aria-label="Next image"
              className="absolute right-4 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 sm:right-6"
            >
              <ChevronRight className="size-6" />
            </button>
          ) : null}

          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl">
              <SiteImage
                src={active.url}
                alt={`${active.label} — ${active.alt}`}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
              />
            </div>
            <p className="mt-3 text-center font-mono text-xs uppercase tracking-widest text-white/70">
              {active.label}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
