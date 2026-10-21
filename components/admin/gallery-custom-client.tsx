"use client"

import { useCallback, useEffect, useState } from "react"
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Loader2, Save, Trash2 } from "lucide-react"
import { GALLERY_CUSTOM_CATEGORIES } from "@/lib/gallery-custom"
import { cn } from "@/lib/utils"

type CustomPhoto = {
  id: string
  image_url: string
  label: string
  category: string
  sort_order: number
  visible: boolean
}

type Draft = CustomPhoto & { saving: boolean; justSaved: boolean }

const inputClass =
  "w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-[#996948]"

/**
 * "Additional gallery photos" - admin-added images appended after the 9 fixed
 * gallery slots on the public Gallery page. Upload (multi), label + category
 * edit, show/hide, reorder, delete. Rendered inside the site-images editor
 * under the Gallery tab.
 */
export function GalleryCustomClient() {
  const [photos, setPhotos] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [notConfigured, setNotConfigured] = useState(false)
  const [error, setError] = useState("")
  const [uploading, setUploading] = useState(false)
  const [label, setLabel] = useState("")
  const [category, setCategory] = useState<string>("Lantana")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/gallery-custom", { cache: "no-store" })
      const data = (await res.json()) as {
        ok: boolean
        photos?: CustomPhoto[]
        configured?: boolean
        error?: string
      }
      if (!data.ok) {
        setError(data.error ?? "Could not load photos.")
        return
      }
      setNotConfigured(data.configured === false)
      setPhotos((data.photos ?? []).map((p) => ({ ...p, saving: false, justSaved: false })))
    } catch {
      setError("Network error loading photos.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function setDraft(id: string, patch: Partial<Draft>) {
    setPhotos((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch, justSaved: false } : r)))
  }

  async function patchRow(id: string, patch: Record<string, unknown>, apply: (rows: Draft[]) => Draft[]) {
    setPhotos((rows) => rows.map((r) => (r.id === id ? { ...r, saving: true, justSaved: false } : r)))
    try {
      const res = await fetch("/api/admin/gallery-custom", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok: boolean; error?: string }
      if (!data.ok) {
        setError(data.error ?? "Save failed.")
        setPhotos((rows) => rows.map((r) => (r.id === id ? { ...r, saving: false } : r)))
        return
      }
      setPhotos((rows) =>
        apply(rows).map((r) => (r.id === id ? { ...r, saving: false, justSaved: true } : { ...r, saving: false })),
      )
      window.setTimeout(() => {
        setPhotos((rows) => rows.map((r) => (r.id === id ? { ...r, justSaved: false } : r)))
      }, 2500)
    } catch {
      setError("Network error saving.")
      setPhotos((rows) => rows.map((r) => (r.id === id ? { ...r, saving: false } : r)))
    }
  }

  function saveRow(row: Draft) {
    void patchRow(
      row.id,
      { label: row.label, category: row.category, visible: row.visible, sort_order: row.sort_order },
      (rows) => rows,
    )
  }

  function toggleVisible(row: Draft) {
    const visible = !row.visible
    setDraft(row.id, { visible })
    void patchRow(row.id, { visible }, (rows) =>
      rows.map((r) => (r.id === row.id ? { ...r, visible } : r)),
    )
  }

  function move(id: string, dir: -1 | 1) {
    const ordered = [...photos].sort((a, b) => a.sort_order - b.sort_order)
    const idx = ordered.findIndex((r) => r.id === id)
    const other = ordered[idx + dir]
    if (!other) return
    const row = ordered[idx]
    void (async () => {
      setDraft(id, { saving: true })
      try {
        for (const [rid, order] of [[row.id, other.sort_order], [other.id, row.sort_order]] as const) {
          const res = await fetch("/api/admin/gallery-custom", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: rid, sort_order: order }),
          })
          const data = (await res.json().catch(() => ({}))) as { ok: boolean; error?: string }
          if (!data.ok) throw new Error(data.error ?? "Reorder failed.")
        }
        await load()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Reorder failed.")
        setPhotos((rows) => rows.map((r) => (r.id === id ? { ...r, saving: false } : r)))
      }
    })()
  }

  async function remove(id: string, labelText: string) {
    if (!window.confirm(`Remove "${labelText || "this photo"}" from the gallery? This cannot be undone.`)) return
    setError("")
    try {
      const res = await fetch(`/api/admin/gallery-custom?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      const data = (await res.json().catch(() => ({}))) as { ok: boolean; error?: string }
      if (!data.ok) {
        setError(data.error ?? "Delete failed.")
        return
      }
      await load()
    } catch {
      setError("Network error deleting.")
    }
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (!picked.length) return
    setUploading(true)
    setError("")
    try {
      const form = new FormData()
      for (const file of picked.slice(0, 10)) form.append("file", file)
      form.append("label", label.trim())
      form.append("category", category)
      const res = await fetch("/api/admin/gallery-custom", { method: "POST", body: form })
      const data = (await res.json().catch(() => ({}))) as { ok: boolean; error?: string }
      if (!data.ok) setError(data.error ?? "Upload failed.")
      else setLabel("")
      await load()
    } catch {
      setError("Network error uploading.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mt-10 border-t border-gray-200 pt-8">
      <h2 className="font-serif text-xl font-bold text-gray-900">Additional gallery photos</h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-500">
        Photos added here appear on the public gallery after the fixed slots above. Give each a
        label and category, reorder them, or hide and remove them at any time.
      </p>

      {notConfigured ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Database table not set up yet.</p>
          <p className="mt-1 leading-relaxed">
            Run <code className="font-mono text-xs">supabase/migrations/020_gallery_custom.sql</code> in
            the Supabase SQL Editor, then reload this page.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      {/* Add */}
      <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
              Label for the new photo(s)
            </span>
            <input
              className={inputClass}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Lantana · Poolside"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">Category</span>
            <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
              {GALLERY_CUSTOM_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#996948] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90">
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            {uploading ? "Uploading…" : "Add photos"}
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => void upload(e)} disabled={uploading} />
          </label>
        </div>
      </div>

      {loading ? (
        <p className="mt-4 font-mono text-[11px] text-gray-400">Loading…</p>
      ) : !photos.length ? (
        <p className="mt-4 font-mono text-[11px] text-gray-400">No additional photos yet.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((row, i) => (
            <li key={row.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="relative h-40 w-full bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={row.image_url} alt={row.label} className="h-full w-full object-cover" />
                {!row.visible ? (
                  <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/80">
                    Hidden
                  </span>
                ) : null}
                {row.justSaved ? (
                  <span className="absolute right-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white">
                    Saved
                  </span>
                ) : null}
              </div>
              <div className="space-y-2 p-3">
                <input
                  className={inputClass}
                  value={row.label}
                  onChange={(e) => setDraft(row.id, { label: e.target.value })}
                  placeholder="Photo label"
                  aria-label="Photo label"
                />
                <select
                  className={cn(inputClass, "text-xs")}
                  value={row.category}
                  onChange={(e) => setDraft(row.id, { category: e.target.value })}
                  aria-label="Photo category"
                >
                  {GALLERY_CUSTOM_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <button onClick={() => move(row.id, -1)} disabled={i === 0 || row.saving} title="Move earlier" className="rounded p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30">
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button onClick={() => move(row.id, 1)} disabled={i === photos.length - 1 || row.saving} title="Move later" className="rounded p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30">
                      <ArrowDown className="size-3.5" />
                    </button>
                    <button onClick={() => toggleVisible(row)} title={row.visible ? "Hide from gallery" : "Show in gallery"} className="rounded p-1.5 text-gray-400 hover:bg-gray-100">
                      {row.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => saveRow(row)} disabled={row.saving} title="Save label and category" className="rounded p-1.5 text-[#996948] hover:bg-[#996948]/10 disabled:opacity-50">
                      {row.saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                    </button>
                    <button onClick={() => void remove(row.id, row.label)} title="Remove photo" className="rounded p-1.5 text-red-400 hover:bg-red-50">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
