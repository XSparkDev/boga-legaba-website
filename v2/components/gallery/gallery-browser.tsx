'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Reveal } from '@v2/components/reveal'
import { SiteImage } from '@v2/components/site-image'
import { MultiCriteriaSearch } from '@v2/components/multi-criteria-search'
import {
  galleryCategories,
  galleryFilterSuggestions,
  galleryItemSearchText,
  getGalleryItems,
  type GalleryCategory,
} from '@v2/data/gallery'
import { matchesAllCriteria } from '@v2/lib/match-criteria'
import { cn } from '@v2/lib/utils'

export function GalleryBrowser() {
  const items = useMemo(() => getGalleryItems(), [])
  const [category, setCategory] = useState<GalleryCategory>('All')
  const [criteria, setCriteria] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (category !== 'All' && item.category !== category) return false
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
    [filtered.length]
  )

  const close = useCallback(() => setLightboxIndex(null), [])

  useEffect(() => {
    if (lightboxIndex === null) return
    const idx = lightboxIndex

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') goTo(idx - 1)
      if (e.key === 'ArrowRight') goTo(idx + 1)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lightboxIndex, close, goTo])

  return (
    <div>
      <Reveal className="mb-8 flex flex-col items-center gap-3 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-brown">
          Browse the portfolio
        </p>
        <ArrowDown className="h-5 w-5 animate-bounce text-deep-earth" aria-hidden />
      </Reveal>

      <Reveal delay={60} className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {galleryCategories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                'rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-all',
                category === c
                  ? 'border-deep-earth bg-deep-earth text-white'
                  : 'border-warm-sand bg-off-white text-body-brown hover:border-deep-earth/25'
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
          matchLabel={filtered.length === 1 ? 'photo meets your criteria' : 'photos meet your criteria'}
        />
      </Reveal>

      {filtered.length === 0 ? (
        <Reveal className="mt-10">
          <div className="rounded-2xl border border-dashed border-warm-sand bg-off-white px-6 py-12 text-center">
            <p className="font-display text-xl italic text-deep-earth">No photos match these filters.</p>
          </div>
        </Reveal>
      ) : (
        <Reveal delay={100} className="mt-8 grid auto-rows-[180px] grid-cols-1 gap-3 min-[420px]:grid-cols-2 min-[420px]:auto-rows-[200px] sm:gap-4 lg:grid-cols-4">
          {filtered.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setLightboxIndex(index)}
              className={cn(
                'group relative overflow-hidden rounded-xl transition-opacity duration-300',
                item.span && 'sm:row-span-2'
              )}
              aria-label={`View ${item.alt}`}
            >
              <SiteImage
                src={item.src}
                alt={item.alt}
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
          aria-label={active.alt}
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>

          {lightboxIndex > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                goTo(lightboxIndex - 1)
              }}
              aria-label="Previous image"
              className="absolute left-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 sm:left-6"
            >
              <ChevronLeft className="h-6 w-6" />
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
              className="absolute right-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 sm:right-6"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          ) : null}

          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <SiteImage
              src={active.src}
              alt={active.alt}
              className="aspect-[3/2] w-full rounded-xl"
            />
            <p className="mt-3 text-center font-mono text-xs uppercase tracking-widest text-white/70">
              {active.alt}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
