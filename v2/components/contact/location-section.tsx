"use client"

import { Clock, Link2, Navigation, Share2 } from "lucide-react"
import { toast } from "sonner"
import { BUSINESS, LOCATION, getLocationFullAddress } from "@/data/rooms"
import { cn } from "@v2/lib/utils"

const WEBSITE_URL = `https://${BUSINESS.website.replace(/^www\./, "")}`
const FULL_ADDRESS = getLocationFullAddress()
const GPS_LABEL = `${LOCATION.coordinates.lat.toFixed(4)}°, ${LOCATION.coordinates.lng.toFixed(4)}°`
const REGION_LINE = `${LOCATION.city}, ${LOCATION.province}, ${LOCATION.country}`

const actionBtn =
  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl px-4 font-sans text-sm font-medium transition-all duration-200 sm:w-auto"

function handleGetDirections() {
  window.open(LOCATION.directionsUrl, "_blank", "noopener,noreferrer")
}

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "")
  textarea.style.position = "absolute"
  textarea.style.left = "-9999px"
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand("copy")
  document.body.removeChild(textarea)
}

async function handleShareLocation() {
  const shareText = `${BUSINESS.name}\n${FULL_ADDRESS}\n${WEBSITE_URL}`
  const shareUrl = LOCATION.mapsUrl

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: BUSINESS.name,
        text: shareText,
        url: shareUrl,
      })
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return
    }
  }

  await copyToClipboard(`${shareText}\n${shareUrl}`)
  toast.success("Location link copied")
}

async function handleShareWebsite() {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: BUSINESS.name,
        url: WEBSITE_URL,
      })
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return
    }
  }

  await copyToClipboard(WEBSITE_URL)
  toast.success("Website link copied")
}

export function LocationSection() {
  return (
    <section className="relative overflow-hidden bg-deep-earth" aria-labelledby="v2-location-heading">
      <div className="relative h-[400px] w-full min-h-[350px] max-h-[450px] overflow-hidden sm:h-[420px]">
        <iframe
          title="Boga Legaba location map — Riviera Park, Mahikeng"
          src={LOCATION.mapEmbedUrl}
          className="absolute inset-0 h-full w-full scale-[1.02] border-0 [filter:saturate(0.65)_brightness(0.5)_contrast(1.12)_sepia(0.15)]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          tabIndex={-1}
        />

        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-deep-earth/60 via-deep-earth/35 to-deep-earth/92"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 bg-deep-earth/15" aria-hidden />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-deep-earth to-transparent"
          aria-hidden
        />
      </div>

      <div className="relative z-10 mx-auto -mt-12 max-w-xl px-4 pb-12 sm:-mt-14 sm:max-w-2xl sm:pb-14 md:px-8">
        <div
          className={cn(
            "rounded-2xl border border-warm-sand px-5 py-4 sm:px-6 sm:py-5",
            "bg-cream shadow-[0_16px_48px_rgba(44,26,14,0.28)] ring-1 ring-black/5",
          )}
        >
          <h2
            id="v2-location-heading"
            className="font-display text-xl font-medium italic leading-snug text-deep-earth sm:text-2xl"
          >
            {BUSINESS.name}
          </h2>
          <p className="mt-1.5 font-sans text-sm font-medium leading-relaxed text-body-brown">
            {FULL_ADDRESS}
          </p>

          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-terracotta/35 bg-white px-3 py-1.5 font-sans text-xs font-medium text-deep-earth">
            <Clock className="size-3.5 shrink-0 text-terracotta" aria-hidden />
            {LOCATION.travelNote}
          </span>

          <p className="mt-3 font-sans text-xs leading-relaxed text-body-brown">
            <span aria-hidden>📍 </span>
            {REGION_LINE}
          </p>
          <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted-brown/90">
            <span aria-hidden>📡 </span>
            GPS: {GPS_LABEL}
          </p>

          <ul className="mt-3 flex flex-wrap gap-1.5">
            {LOCATION.nearbyLandmarks.map((landmark) => (
              <li
                key={landmark}
                className="rounded-full border border-warm-sand bg-cream/80 px-2.5 py-0.5 font-sans text-[11px] text-body-brown"
              >
                {landmark}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={handleGetDirections}
              className={cn(
                actionBtn,
                "bg-terracotta text-white hover:bg-terracotta-light hover:shadow-[0_6px_20px_rgba(196,106,74,0.35)]",
              )}
            >
              <Navigation className="size-3.5" />
              Get Directions
            </button>

            <button
              type="button"
              onClick={handleShareLocation}
              className={cn(
                actionBtn,
                "border border-warm-sand bg-cream text-deep-earth hover:border-terracotta/35 hover:shadow-sm",
              )}
            >
              <Share2 className="size-3.5 text-terracotta" />
              Share Location
            </button>

            <button
              type="button"
              onClick={handleShareWebsite}
              className={cn(
                actionBtn,
                "border border-warm-sand bg-cream text-deep-earth hover:border-terracotta/35 hover:shadow-sm",
              )}
            >
              <Link2 className="size-3.5 text-terracotta" />
              Share Website
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
