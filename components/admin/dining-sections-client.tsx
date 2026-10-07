"use client"

import { useCallback, useEffect, useState } from "react"
import { ArrowUp, ArrowDown, Eye, EyeOff, Loader2, Plus, Save, Trash2 } from "lucide-react"
import {
  DINING_ICON_OPTIONS,
  DINING_STATUSES,
  type DiningSection,
} from "@/lib/dining-sections"
import { cn } from "@/lib/utils"

type Draft = DiningSection & { saving: boolean; justSaved: boolean }

const inputClass =
  "w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-[#996948]"

/**
 * Admin editor for the public Dining page cards. Each card: title, body copy,
 * icon, status (Coming soon / Open), visibility, order (up/down), delete, and
 * an add-new form. Mutations hit /api/admin/dining-sections (cookie authed)
 * and the list is refetched after every change. The public page is
 * force-dynamic, so saved edits appear immediately.
 */
export function DiningSectionsClient() {
  const [sections, setSections] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [notConfigured, setNotConfigured] = useState(false)
  const [error, setError] = useState("")
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: "", body: "", icon: "utensils", status: "coming-soon" })

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/dining-sections", { cache: "no-store" })
      const data = (await res.json()) as {
        ok: boolean
        sections?: DiningSection[]
        configured?: boolean
        error?: string
      }
      if (!data.ok) {
        setError(data.error ?? "Could not load sections.")
        return
      }
      if (data.configured === false) setNotConfigured(true)
      else setNotConfigured(false)
      setSections((data.sections ?? []).map((s) => ({ ...s, saving: false, justSaved: false })))
    } catch {
      setError("Network error loading sections.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function mutate(
    id: string,
    init: RequestInit,
    apply: (rows: Draft[]) => Draft[],
  ) {
    setSections((rows) => rows.map((r) => (r.id === id ? { ...r, saving: true, justSaved: false } : r)))
    try {
      const res = await fetch("/api/admin/dining-sections", {
        ...init,
        headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
      })
      const data = (await res.json().catch(() => ({}))) as { ok: boolean; error?: string }
      if (!data.ok) {
        setError(data.error ?? "Save failed.")
        setSections((rows) => rows.map((r) => (r.id === id ? { ...r, saving: false } : r)))
        return
      }
      setSections((rows) =>
        apply(rows).map((r) => (r.id === id ? { ...r, saving: false, justSaved: true } : { ...r, saving: false })),
      )
      window.setTimeout(() => {
        setSections((rows) => rows.map((r) => (r.id === id ? { ...r, justSaved: false } : r)))
      }, 2500)
    } catch {
      setError("Network error saving.")
      setSections((rows) => rows.map((r) => (r.id === id ? { ...r, saving: false } : r)))
    }
  }

  function setDraft(id: string, patch: Partial<Draft>) {
    setSections((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch, justSaved: false } : r)))
  }

  function saveRow(row: Draft) {
    if (!row.title.trim()) {
      setError("Title cannot be empty.")
      return
    }
    void mutate(row.id, {
      method: "PATCH",
      body: JSON.stringify({
        id: row.id,
        title: row.title.trim(),
        body: row.body,
        icon: row.icon,
        status: row.status,
        visible: row.visible,
        sort_order: row.sort_order,
      }),
    }, (rows) => rows)
  }

  function toggleVisible(row: Draft) {
    const visible = !row.visible
    setDraft(row.id, { visible })
    void mutate(row.id, { method: "PATCH", body: JSON.stringify({ id: row.id, visible }) }, (rows) =>
      rows.map((r) => (r.id === row.id ? { ...r, visible } : r)),
    )
  }

  function move(id: string, dir: -1 | 1) {
    const ordered = [...sections].sort((a, b) => a.sort_order - b.sort_order)
    const idx = ordered.findIndex((r) => r.id === id)
    const other = ordered[idx + dir]
    if (!other) return
    const row = ordered[idx]
    // Swap the two sort orders (two PATCHes, then refetch for truth).
    void (async () => {
      setDraft(id, { saving: true })
      try {
        for (const [rid, order] of [[row.id, other.sort_order], [other.id, row.sort_order]] as const) {
          const res = await fetch("/api/admin/dining-sections", {
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
        setSections((rows) => rows.map((r) => (r.id === id ? { ...r, saving: false } : r)))
      }
    })()
  }

  async function remove(id: string, title: string) {
    if (!window.confirm(`Remove "${title}" from the Dining page? This cannot be undone.`)) return
    setError("")
    try {
      const res = await fetch(`/api/admin/dining-sections?id=${encodeURIComponent(id)}`, { method: "DELETE" })
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

  async function create() {
    if (!form.title.trim()) {
      setError("Give the new card a title first.")
      return
    }
    setCreating(true)
    setError("")
    try {
      const res = await fetch("/api/admin/dining-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, title: form.title.trim(), visible: true }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok: boolean; error?: string }
      if (!data.ok) {
        setError(data.error ?? "Create failed.")
        return
      }
      setForm({ title: "", body: "", icon: "utensils", status: "coming-soon" })
      await load()
    } catch {
      setError("Network error creating.")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      {notConfigured ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Database table not set up yet.</p>
          <p className="mt-1 leading-relaxed">
            Run <code className="font-mono text-xs">supabase/migrations/019_dining_sections.sql</code> in the
            Supabase SQL Editor, then reload this page. The public Dining page keeps showing its built-in
            cards until then.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      {loading ? (
        <p className="flex items-center gap-2 py-10 text-sm text-gray-500">
          <Loader2 className="size-4 animate-spin" /> Loading cards…
        </p>
      ) : (
        <ul className="space-y-4">
          {sections.map((row, i) => (
            <li key={row.id} className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-gray-400">
                  Card {i + 1}
                </span>
                {!row.visible ? (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-gray-500">
                    Hidden
                  </span>
                ) : null}
                {row.justSaved ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-700">
                    Saved
                  </span>
                ) : null}
                <span className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    title="Move up"
                    disabled={i === 0 || row.saving}
                    onClick={() => move(row.id, -1)}
                    className="rounded-lg border border-gray-200 p-1.5 text-gray-500 transition-colors hover:border-gray-300 disabled:opacity-30"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    title="Move down"
                    disabled={i === sections.length - 1 || row.saving}
                    onClick={() => move(row.id, 1)}
                    className="rounded-lg border border-gray-200 p-1.5 text-gray-500 transition-colors hover:border-gray-300 disabled:opacity-30"
                  >
                    <ArrowDown className="size-4" />
                  </button>
                  <button
                    type="button"
                    title={row.visible ? "Hide from the Dining page" : "Show on the Dining page"}
                    onClick={() => toggleVisible(row)}
                    className="rounded-lg border border-gray-200 p-1.5 text-gray-500 transition-colors hover:border-gray-300"
                  >
                    {row.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </button>
                  <button
                    type="button"
                    title="Delete this card"
                    onClick={() => void remove(row.id, row.title)}
                    className="rounded-lg border border-red-200 p-1.5 text-red-600 transition-colors hover:bg-red-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </span>
              </div>

              <div className="mt-3 grid gap-3">
                <input
                  className={cn(inputClass, "font-semibold")}
                  value={row.title}
                  onChange={(e) => setDraft(row.id, { title: e.target.value })}
                  placeholder="Card title"
                  aria-label="Card title"
                />
                <textarea
                  className={cn(inputClass, "min-h-20")}
                  value={row.body}
                  onChange={(e) => setDraft(row.id, { body: e.target.value })}
                  placeholder="Card description"
                  aria-label="Card description"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">Icon</span>
                    <select
                      className={inputClass}
                      value={row.icon}
                      onChange={(e) => setDraft(row.id, { icon: e.target.value })}
                    >
                      {DINING_ICON_OPTIONS.map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">Status</span>
                    <select
                      className={inputClass}
                      value={row.status}
                      onChange={(e) => {
                        const status = e.target.value as DiningSection["status"]
                        setDraft(row.id, { status })
                        void mutate(
                          row.id,
                          { method: "PATCH", body: JSON.stringify({ id: row.id, status }) },
                          (rows) => rows,
                        )
                      }}
                    >
                      {DINING_STATUSES.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div>
                  <button
                    type="button"
                    disabled={row.saving}
                    onClick={() => saveRow(row)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#000000] px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {row.saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Save card
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add new */}
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-gray-900">
          <Plus className="size-4" /> Add a new card
        </h2>
        <div className="mt-3 grid gap-3">
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Card title (e.g. Wine Tastings)"
            aria-label="New card title"
          />
          <textarea
            className={cn(inputClass, "min-h-20")}
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            placeholder="Card description"
            aria-label="New card description"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">Icon</span>
              <select
                className={inputClass}
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              >
                {DINING_ICON_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">Status</span>
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {DINING_STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <button
              type="button"
              disabled={creating}
              onClick={() => void create()}
              className="inline-flex items-center gap-2 rounded-full bg-[#996948] px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Add card
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
