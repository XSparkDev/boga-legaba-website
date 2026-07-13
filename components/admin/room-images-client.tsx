"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Loader2, Trash2, Upload, ArrowUp, ArrowDown } from "lucide-react"

export type AdminRoom = { bbroomid: number; name: string; propertyName: string }

type RoomImage = {
  id: string
  bbroomid: number
  image_url: string
  title: string | null
  display_order: number
  created_at: string
}

export function RoomImagesClient({ rooms }: { rooms: AdminRoom[] }) {
  const [expanded, setExpanded] = useState<number | null>(null)

  const byProperty = new Map<string, AdminRoom[]>()
  for (const room of rooms) {
    const list = byProperty.get(room.propertyName) ?? []
    list.push(room)
    byProperty.set(room.propertyName, list)
  }

  return (
    <div className="space-y-6">
      {Array.from(byProperty.entries()).map(([propertyName, propertyRooms]) => (
        <div key={propertyName}>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-gray-400">{propertyName}</p>
          <div className="space-y-2">
            {propertyRooms.map((room) => (
              <div key={room.bbroomid} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <button
                  onClick={() => setExpanded(expanded === room.bbroomid ? null : room.bbroomid)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
                >
                  <p className="font-serif text-sm font-bold text-gray-900">{room.name}</p>
                  {expanded === room.bbroomid ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
                </button>
                {expanded === room.bbroomid && (
                  <div className="border-t border-gray-100 px-4 py-4">
                    <RoomGallery bbroomid={room.bbroomid} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function RoomGallery({ bbroomid }: { bbroomid: number }) {
  const [images, setImages] = useState<RoomImage[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/room-images?bbroomid=${bbroomid}`)
      const data = (await res.json()) as { ok: boolean; images?: RoomImage[]; error?: string }
      if (data.ok) setImages(data.images ?? [])
      else setError(data.error ?? "Failed to load images")
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  if (images === null && !loading) {
    load()
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploading(true)
    setError("")
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("bbroomid", String(bbroomid))
      const res = await fetch("/api/admin/room-images", { method: "POST", body: form })
      const data = (await res.json()) as { ok: boolean; error?: string }
      if (!data.ok) setError(data.error ?? "Upload failed")
      await load()
    } catch {
      setError("Network error")
    } finally {
      setUploading(false)
    }
  }

  async function updateTitle(id: string, title: string) {
    await fetch("/api/admin/room-images", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title }),
    })
    setImages((prev) => prev?.map((img) => (img.id === id ? { ...img, title } : img)) ?? null)
  }

  async function move(index: number, direction: -1 | 1) {
    if (!images) return
    const target = index + direction
    if (target < 0 || target >= images.length) return
    const a = images[index]
    const b = images[target]
    const next = [...images]
    next[index] = { ...b, display_order: a.display_order }
    next[target] = { ...a, display_order: b.display_order }
    next.sort((x, y) => x.display_order - y.display_order)
    setImages(next)
    await Promise.all([
      fetch("/api/admin/room-images", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: a.id, display_order: b.display_order }),
      }),
      fetch("/api/admin/room-images", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: b.id, display_order: a.display_order }),
      }),
    ])
  }

  async function remove(id: string) {
    setImages((prev) => prev?.filter((img) => img.id !== id) ?? null)
    await fetch(`/api/admin/room-images?id=${id}`, { method: "DELETE" })
  }

  return (
    <div>
      <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-[11px] font-semibold text-gray-700 hover:bg-gray-100">
        {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
        {uploading ? "Uploading…" : "Upload photo"}
        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
      </label>
      {error && <p className="mt-2 font-mono text-[10px] text-red-500">{error}</p>}

      {loading ? (
        <p className="mt-4 font-mono text-[11px] text-gray-400">Loading…</p>
      ) : !images?.length ? (
        <p className="mt-4 font-mono text-[11px] text-gray-400">No photos yet.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img, i) => (
            <div key={img.id} className="overflow-hidden rounded-lg border border-gray-200">
              {/* Admin-uploaded photos, unknown dimensions — plain img avoids
                  next/image's required width/height for this dynamic set. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.image_url} alt={img.title ?? ""} className="h-32 w-full object-cover" />
              <div className="space-y-1 p-2">
                <input
                  defaultValue={img.title ?? ""}
                  placeholder="Title…"
                  onBlur={(e) => e.target.value !== (img.title ?? "") && updateTitle(img.id, e.target.value)}
                  className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30">
                      <ArrowUp className="size-3" />
                    </button>
                    <button onClick={() => move(i, 1)} disabled={i === images.length - 1} className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30">
                      <ArrowDown className="size-3" />
                    </button>
                  </div>
                  <button onClick={() => remove(img.id)} className="rounded p-1 text-red-400 hover:bg-red-50">
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
