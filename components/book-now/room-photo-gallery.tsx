"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, X, Maximize2, BedDouble, Users, Images } from "lucide-react"

// ---------------------------------------------------------------------------
// Room photo gallery — real per-room photos (from Supabase room_images).
//
// Airbnb-style "lead photo + thumbnails": one large lead image with a 2×2 grid
// of thumbnails beside it (sm+), collapsing to a single lead image with a
// "View all photos" button on mobile. Clicking any photo (or the button) opens
// a full-screen lightbox with prev/next arrows, keyboard nav and mobile swipe —
// the same interaction the /gallery page uses, kept consistent here.
//
// Only rendered when a room actually HAS real photos; the book-now page keeps
// its existing NightsBridge hero as the fallback when there are none.
// ---------------------------------------------------------------------------

export type GalleryPhoto = { url: string; title: string | null }

function fmtDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  return isNaN(d.getTime())
    ? iso
    : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(d)
}

function nightCount(arrive: string, depart: string) {
  const n = Math.round((new Date(depart).getTime() - new Date(arrive).getTime()) / 86_400_000)
  return n > 0 ? n : 1
}

export function RoomPhotoGallery({
  photos,
  roomTypeName,
  arrive,
  depart,
  quality,
  roomSizeM2,
  bedType,
  maxAdults,
}: {
  photos: GalleryPhoto[]
  roomTypeName: string
  arrive: string
  depart: string
  quality?: string | null
  roomSizeM2?: number | null
  bedType?: string | null
  maxAdults?: number | null
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const touchStartX = useRef<number | null>(null)
  const nights = nightCount(arrive, depart)

  const open = useCallback((i: number) => setLightboxIndex(i), [])
  const close = useCallback(() => setLightboxIndex(null), [])
  const goTo = useCallback(
    (i: number) => {
      if (i < 0 || i >= photos.length) return
      setLightboxIndex(i)
    },
    [photos.length],
  )

  useEffect(() => {
    if (lightboxIndex === null) return
    const idx = lightboxIndex
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close()
      if (e.key === "ArrowLeft") goTo(idx - 1)
      if (e.key === "ArrowRight") goTo(idx + 1)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [lightboxIndex, close, goTo])

  const lead = photos[0]
  const thumbs = photos.slice(1, 5) // up to 4 thumbnails beside the lead
  const extra = photos.length - 5 // count hidden behind the last thumbnail
  const active = lightboxIndex !== null ? photos[lightboxIndex] : null

  return (
    <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6 lg:px-8">
      {/* ── Gallery grid ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl">
        {photos.length === 1 ? (
          <button
            type="button"
            onClick={() => open(0)}
            aria-label={`View photo of ${roomTypeName}`}
            className="group block aspect-[16/9] w-full overflow-hidden bg-gray-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lead.url}
              alt={lead.title ?? `${roomTypeName} photo`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </button>
        ) : (
          <div className="grid h-72 grid-cols-1 gap-2 sm:h-96 sm:grid-cols-4 sm:grid-rows-2 lg:h-[440px]">
            {/* Lead photo */}
            <button
              type="button"
              onClick={() => open(0)}
              aria-label={`View photos of ${roomTypeName}`}
              className="group relative col-span-1 overflow-hidden bg-gray-100 sm:col-span-2 sm:row-span-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lead.url}
                alt={lead.title ?? `${roomTypeName} photo 1`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </button>

            {/* Thumbnails — hidden on mobile (lead + "view all" button is enough) */}
            {thumbs.map((p, i) => {
              const index = i + 1
              const isLastVisible = i === thumbs.length - 1 && extra > 0
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => open(index)}
                  aria-label={`View ${roomTypeName} photo ${index + 1}`}
                  className="group relative hidden overflow-hidden bg-gray-100 sm:block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={p.title ?? `${roomTypeName} photo ${index + 1}`}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {isLastVisible ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/55 font-body text-lg font-semibold text-white">
                      +{extra}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        )}

        {/* "Show all photos" button */}
        <button
          type="button"
          onClick={() => open(0)}
          className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg border border-white/40 bg-black/60 px-3 py-1.5 font-body text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/75"
        >
          <Images className="size-3.5" />
          Show all {photos.length} photos
        </button>
      </div>

      {/* ── Meta row (kept from the old hero so nothing is lost) ──── */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {quality ? (
            <span className="inline-block rounded-full border border-[#996948]/40 bg-[#996948]/10 px-2.5 py-0.5 font-body text-[11px] font-medium text-[#996948]">
              {quality}
            </span>
          ) : null}
          {roomSizeM2 ? (
            <span className="flex items-center gap-1.5 font-body text-xs text-gray-500">
              <Maximize2 className="size-3.5 text-[#996948]" />
              {roomSizeM2} m²
            </span>
          ) : null}
          {bedType ? (
            <span className="flex items-center gap-1.5 font-body text-xs text-gray-500">
              <BedDouble className="size-3.5 text-[#996948]" />
              {bedType} bed
            </span>
          ) : null}
          {maxAdults ? (
            <span className="flex items-center gap-1.5 font-body text-xs text-gray-500">
              <Users className="size-3.5 text-[#996948]" />
              Max {maxAdults} adults
            </span>
          ) : null}
        </div>
        <p className="font-body text-xs text-gray-500">
          {fmtDate(arrive)} → {fmtDate(depart)}
          <span className="ml-1.5 font-semibold text-[#996948]">
            · {nights} night{nights !== 1 ? "s" : ""}
          </span>
        </p>
      </div>

      {/* ── Lightbox ─────────────────────────────────────────────── */}
      {active && lightboxIndex !== null ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${roomTypeName} photos`}
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
              aria-label="Previous photo"
              className="absolute left-4 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 sm:inline-flex sm:left-6"
            >
              <ChevronLeft className="size-6" />
            </button>
          ) : null}

          {lightboxIndex < photos.length - 1 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                goTo(lightboxIndex + 1)
              }}
              aria-label="Next photo"
              className="absolute right-4 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 sm:inline-flex sm:right-6"
            >
              <ChevronRight className="size-6" />
            </button>
          ) : null}

          <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div
              className="relative aspect-[3/2] w-full overflow-hidden rounded-xl bg-black"
              onTouchStart={(e) => {
                touchStartX.current = e.touches[0]?.clientX ?? null
              }}
              onTouchEnd={(e) => {
                if (touchStartX.current === null || lightboxIndex === null) return
                const dx = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current
                const THRESHOLD = 40
                if (dx > THRESHOLD) goTo(lightboxIndex - 1)
                else if (dx < -THRESHOLD) goTo(lightboxIndex + 1)
                touchStartX.current = null
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.url}
                alt={active.title ?? `${roomTypeName} photo ${lightboxIndex + 1}`}
                className="h-full w-full object-contain"
              />

              {/* Mobile: tap left/right half to move */}
              {lightboxIndex > 0 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    goTo(lightboxIndex - 1)
                  }}
                  aria-label="Previous photo"
                  className="absolute inset-y-0 left-0 flex w-1/2 items-center justify-start pl-3 sm:hidden"
                >
                  <span className="inline-flex size-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm">
                    <ChevronLeft className="size-6" />
                  </span>
                </button>
              ) : null}
              {lightboxIndex < photos.length - 1 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    goTo(lightboxIndex + 1)
                  }}
                  aria-label="Next photo"
                  className="absolute inset-y-0 right-0 flex w-1/2 items-center justify-end pr-3 sm:hidden"
                >
                  <span className="inline-flex size-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm">
                    <ChevronRight className="size-6" />
                  </span>
                </button>
              ) : null}
            </div>
            <p className="mt-3 text-center font-body text-xs text-white/70">
              {active.title ? `${active.title} · ` : ""}
              {lightboxIndex + 1} / {photos.length}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
