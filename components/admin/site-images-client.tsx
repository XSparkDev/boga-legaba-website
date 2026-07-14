"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Upload, Loader2, RotateCcw, Check } from "lucide-react"
import {
  SITE_IMAGE_SLOTS,
  SITE_IMAGE_PAGES,
  SITE_IMAGE_DEFAULTS,
  type SiteImagePage,
} from "@/lib/site-image-slots"

type Override = { image_url: string; alt: string | null; updated_at: string }

/**
 * Admin editor for the fixed image slots across the marketing pages. Each slot
 * can be replaced with an uploaded photo or reverted to its built-in default.
 * All writes go through /api/admin/site-images (admin-cookie protected).
 */
export function SiteImagesClient() {
  const [page, setPage] = useState<SiteImagePage>("Home")
  const [overrides, setOverrides] = useState<Record<string, Override>>({})
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    try {
      const res = await fetch("/api/admin/site-images")
      const data = (await res.json()) as { ok: boolean; overrides?: Record<string, Override>; error?: string }
      if (data.ok && data.overrides) setOverrides(data.overrides)
      else setError(data.error ?? "Could not load images")
    } catch {
      setError("Could not load images")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const slotsForPage = useMemo(() => SITE_IMAGE_SLOTS.filter((s) => s.page === page), [page])

  async function handleUpload(key: string, file: File) {
    setBusyKey(key)
    setError(null)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("key", key)
      const res = await fetch("/api/admin/site-images", { method: "POST", body: form })
      const data = (await res.json()) as { ok: boolean; override?: Override; error?: string }
      if (!data.ok) {
        setError(data.error ?? "Upload failed")
      } else if (data.override) {
        setOverrides((prev) => ({ ...prev, [key]: { ...data.override!, updated_at: new Date().toISOString() } }))
      }
    } catch {
      setError("Upload failed")
    } finally {
      setBusyKey(null)
    }
  }

  async function handleRevert(key: string) {
    setBusyKey(key)
    setError(null)
    try {
      const res = await fetch(`/api/admin/site-images?key=${encodeURIComponent(key)}`, { method: "DELETE" })
      const data = (await res.json()) as { ok: boolean; error?: string }
      if (!data.ok) {
        setError(data.error ?? "Revert failed")
      } else {
        setOverrides((prev) => {
          const next = { ...prev }
          delete next[key]
          return next
        })
      }
    } catch {
      setError("Revert failed")
    } finally {
      setBusyKey(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 font-mono text-[11px] text-gray-400">
        <Loader2 className="size-4 animate-spin" /> Loading images…
      </div>
    )
  }

  return (
    <div>
      {/* Page tabs */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        {SITE_IMAGE_PAGES.map((p) => {
          const count = SITE_IMAGE_SLOTS.filter((s) => s.page === p).length
          const active = p === page
          return (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`rounded-lg px-3 py-1.5 font-mono text-[11px] transition-colors ${
                active
                  ? "bg-[#996948] text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {p} <span className={active ? "text-white/70" : "text-gray-400"}>({count})</span>
            </button>
          )
        })}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-mono text-[11px] text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {slotsForPage.map((s) => {
          const override = overrides[s.key]
          const currentUrl = override?.image_url || SITE_IMAGE_DEFAULTS[s.key]?.url || ""
          const isCustom = !!override
          const busy = busyKey === s.key
          return (
            <SlotCard
              key={s.key}
              label={s.label}
              url={currentUrl}
              isCustom={isCustom}
              busy={busy}
              onUpload={(file) => handleUpload(s.key, file)}
              onRevert={() => handleRevert(s.key)}
            />
          )
        })}
      </div>
    </div>
  )
}

function SlotCard({
  label,
  url,
  isCustom,
  busy,
  onUpload,
  onRevert,
}: {
  label: string
  url: string
  isCustom: boolean
  busy: boolean
  onUpload: (file: File) => void
  onRevert: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="relative h-40 w-full bg-gray-100">
        {url ? (
          // Admin preview only — plain img avoids next/image remote-domain config.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-[10px] text-gray-400">No image</div>
        )}
        <span
          className={`absolute right-2 top-2 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
            isCustom ? "bg-[#996948] text-white" : "bg-black/60 text-white/80"
          }`}
        >
          {isCustom ? "Custom" : "Default"}
        </span>
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2 className="size-5 animate-spin text-[#996948]" />
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="mb-2 truncate font-mono text-[11px] font-semibold text-gray-800" title={label}>
          {label}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#996948] px-2.5 py-1.5 font-mono text-[10px] font-semibold text-white hover:brightness-110 disabled:opacity-50"
          >
            <Upload className="size-3" />
            {isCustom ? "Replace" : "Upload"}
          </button>
          {isCustom && (
            <button
              onClick={onRevert}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 font-mono text-[10px] text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <RotateCcw className="size-3" />
              Revert
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onUpload(f)
              e.target.value = ""
            }}
          />
        </div>
        {isCustom && (
          <p className="mt-1.5 flex items-center gap-1 font-mono text-[9px] text-green-600">
            <Check className="size-2.5" /> Custom image active on the live site
          </p>
        )}
      </div>
    </div>
  )
}
