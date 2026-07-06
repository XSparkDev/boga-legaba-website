"use client"

import { Clock, Link2, Navigation, Share2, MapPin, Radio } from "lucide-react"
import { toast } from "sonner"
import { BUSINESS, LOCATION, getLocationFullAddress } from "@/data/rooms"
import { cn } from "@/lib/utils"

const WEBSITE_URL = `https://${BUSINESS.website.replace(/^www\./, "")}`
const FULL_ADDRESS = getLocationFullAddress()
const GPS_LABEL = `${LOCATION.coordinates.lat.toFixed(4)}°, ${LOCATION.coordinates.lng.toFixed(4)}°`
const REGION_LINE = `${LOCATION.city}, ${LOCATION.province}, ${LOCATION.country}`

const actionBtn =
  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-all duration-200 sm:w-auto"

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
    <section className="relative overflow-hidden bg-[#000000]" aria-labelledby="location-heading">
      {/* Full-width map */}
      <div className="relative h-[400px] w-full min-h-[350px] max-h-[450px] overflow-hidden sm:h-[420px]">
        <iframe
          title="Boga Legaba location map — Riviera Park, Mahikeng"
          src={LOCATION.mapEmbedUrl}
          className="absolute inset-0 h-full w-full border-0 [filter:saturate(0.85)]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          tabIndex={-1}
        />

        {/* Flat semi-transparent overlay for text legibility — brand guide: flat
            color blocks, no gradients. */}
        <div className="pointer-events-none absolute inset-0 bg-[#000000]/55" aria-hidden />
      </div>

      {/* Compact overlapping card */}
      <div className="relative z-10 mx-auto -mt-12 max-w-xl px-4 pb-12 sm:-mt-14 sm:max-w-2xl sm:pb-14">
        <div
          className={cn(
            "rounded-2xl border border-black/8 px-5 py-4 sm:px-6 sm:py-5",
            "bg-[#FFFFFF] shadow-[0_16px_48px_rgba(0,0,0,0.28)] ring-1 ring-black/5",
          )}
        >
          <h2
            id="location-heading"
            className="font-serif text-xl font-semibold leading-snug text-[#000000] sm:text-2xl"
          >
            {BUSINESS.name}
          </h2>
          <p className="mt-1.5 break-words text-sm font-medium leading-relaxed text-[#262626]">{FULL_ADDRESS}</p>

          <span className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full border border-gold/35 bg-white px-3 py-1.5 text-xs font-medium text-[#000000]">
            <Clock className="size-3.5 shrink-0 text-gold" aria-hidden />
            {LOCATION.travelNote}
          </span>

          <p className="mt-3 flex items-center gap-1.5 text-xs leading-relaxed text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            {REGION_LINE}
          </p>
          <p className="mt-1 flex items-center gap-1.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
            <Radio className="size-3.5 shrink-0" />
            GPS: {GPS_LABEL}
          </p>

          <ul className="mt-3 flex flex-wrap gap-1.5">
            {LOCATION.nearbyLandmarks.map((landmark) => (
              <li
                key={landmark}
                className="rounded-full border border-black/6 bg-white/80 px-2.5 py-0.5 text-[11px] text-body-text"
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
                "bg-gold text-[#000000] hover:bg-gold-hover hover:shadow-[0_6px_20px_rgba(201,168,76,0.3)]",
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
                "border border-black/10 bg-white text-foreground hover:border-gold/35 hover:shadow-sm",
              )}
            >
              <Share2 className="size-3.5 text-gold" />
              Share Location
            </button>

            <button
              type="button"
              onClick={handleShareWebsite}
              className={cn(
                actionBtn,
                "border border-black/10 bg-white text-foreground hover:border-gold/35 hover:shadow-sm",
              )}
            >
              <Link2 className="size-3.5 text-gold" />
              Share Website
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
