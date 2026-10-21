import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { DINING_ICON_OPTIONS, DINING_STATUSES } from "@/lib/dining-sections"

export const dynamic = "force-dynamic"

/**
 * Admin-only CRUD for the Dining page cards (`dining_sections` table,
 * migration 019). Same `bl_admin_session` cookie auth as every other admin
 * route. The public page falls back to built-in defaults when the table is
 * missing, so GET reports `configured: false` instead of failing hard.
 */
const VALID_ICONS: Set<string> = new Set(DINING_ICON_OPTIONS.map((o) => o.key))
const VALID_STATUSES: Set<string> = new Set(DINING_STATUSES.map((s) => s.key))

async function isAuthenticated() {
  const store = await cookies()
  return store.get("bl_admin_session")?.value === process.env.ADMIN_SECRET
}

function isMissingTable(error: { message?: string; code?: string } | null): boolean {
  const msg = error?.message ?? ""
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    /relation .* does not exist|schema cache/i.test(msg)
  )
}

// GET - all rows (including hidden), ordered. Never 500s on a missing table.
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const sb = createSupabaseAdminClient()
  const { data, error } = await sb
    .from("dining_sections")
    .select("id, title, body, icon, status, sort_order, visible, updated_at")
    .order("sort_order", { ascending: true })
  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json({ ok: true, sections: [], configured: false })
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 })
  }
  return NextResponse.json({ ok: true, sections: data ?? [], configured: true })
}

// POST { title, body?, icon?, status?, visible? } - create a card.
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const title = String(body?.title ?? "").trim()
  const text = String(body?.body ?? "").trim()
  const icon = String(body?.icon ?? "utensils")
  const status = String(body?.status ?? "coming-soon")
  const visible = body?.visible !== false
  if (!title) {
    return NextResponse.json({ ok: false, error: "Title is required" }, { status: 400 })
  }
  if (!VALID_ICONS.has(icon)) {
    return NextResponse.json({ ok: false, error: "Unknown icon" }, { status: 400 })
  }
  if (!VALID_STATUSES.has(status)) {
    return NextResponse.json({ ok: false, error: "Unknown status" }, { status: 400 })
  }

  const sb = createSupabaseAdminClient()
  // Fail fast with a clear message when migration 019 hasn't been applied yet.
  const { error: checkError } = await sb.from("dining_sections").select("id").limit(1)
  if (checkError) {
    return NextResponse.json(
      {
        ok: false,
        error: isMissingTable(checkError)
          ? "Table dining_sections does not exist yet - run migration 019_dining_sections.sql first."
          : checkError.message,
      },
      { status: isMissingTable(checkError) ? 503 : 502 },
    )
  }

  const { data: maxRow } = await sb
    .from("dining_sections")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = (maxRow?.sort_order ?? 0) + 10
  const id = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "section"}-${Date.now().toString(36)}`
  const { data, error } = await sb
    .from("dining_sections")
    .insert({ id, title, body: text, icon, status, visible, sort_order: nextOrder })
    .select("id, title, body, icon, status, sort_order, visible, updated_at")
    .single()
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 })
  }
  return NextResponse.json({ ok: true, section: data })
}

// PATCH { id, title?, body?, icon?, status?, visible?, sort_order? } - edit.
export async function PATCH(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const id = String(body?.id ?? "").trim()
  if (!id) {
    return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 })
  }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body?.title !== undefined) {
    const title = String(body.title).trim()
    if (!title) return NextResponse.json({ ok: false, error: "Title cannot be empty" }, { status: 400 })
    patch.title = title
  }
  if (body?.body !== undefined) patch.body = String(body.body)
  if (body?.icon !== undefined) {
    if (!VALID_ICONS.has(String(body.icon))) {
      return NextResponse.json({ ok: false, error: "Unknown icon" }, { status: 400 })
    }
    patch.icon = String(body.icon)
  }
  if (body?.status !== undefined) {
    if (!VALID_STATUSES.has(String(body.status))) {
      return NextResponse.json({ ok: false, error: "Unknown status" }, { status: 400 })
    }
    patch.status = String(body.status)
  }
  if (body?.visible !== undefined) patch.visible = body.visible === true
  if (body?.sort_order !== undefined) {
    const n = Number(body.sort_order)
    if (!Number.isFinite(n)) return NextResponse.json({ ok: false, error: "sort_order must be a number" }, { status: 400 })
    patch.sort_order = n
  }

  const sb = createSupabaseAdminClient()
  const { error } = await sb.from("dining_sections").update(patch).eq("id", id)
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}

// DELETE ?id=... - remove a card.
export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const id = new URL(request.url).searchParams.get("id")?.trim() || ""
  if (!id) {
    return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 })
  }
  const sb = createSupabaseAdminClient()
  const { error } = await sb.from("dining_sections").delete().eq("id", id)
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}
