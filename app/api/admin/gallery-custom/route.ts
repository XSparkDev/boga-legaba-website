import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { GALLERY_CUSTOM_CATEGORIES } from "@/lib/gallery-custom"

export const dynamic = "force-dynamic"

async function isAuthenticated() {
  const store = await cookies()
  return store.get("bl_admin_session")?.value === process.env.ADMIN_SECRET
}

const BUCKET = "gallery-custom"
const VALID_CATEGORIES = new Set<string>(GALLERY_CUSTOM_CATEGORIES as unknown as string[])

function isMissingTable(error: { message?: string; code?: string } | null): boolean {
  const msg = error?.message ?? ""
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    /relation .* does not exist|schema cache/i.test(msg)
  )
}

const SELECT = "id, image_url, label, category, sort_order, visible, updated_at"

// GET - all custom photos, ordered (including hidden, for the editor).
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const sb = createSupabaseAdminClient()
  const { data, error } = await sb.from("gallery_custom").select(SELECT).order("sort_order", { ascending: true })
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ ok: true, photos: [], configured: false })
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 })
  }
  return NextResponse.json({ ok: true, photos: data ?? [], configured: true })
}

// POST multipart: file (up to 10), label?, category? - append new photos.
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const form = await request.formData()
  const files = form.getAll("file").filter((f): f is File => f instanceof File)
  const label = (form.get("label") as string | null)?.trim() || ""
  const category = (form.get("category") as string | null)?.trim() || "Lantana"
  if (!files.length) {
    return NextResponse.json({ ok: false, error: "file is required" }, { status: 400 })
  }
  if (files.length > 10) {
    return NextResponse.json({ ok: false, error: "Upload at most 10 photos at a time" }, { status: 400 })
  }
  if (!VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ ok: false, error: "Unknown category" }, { status: 400 })
  }

  const sb = createSupabaseAdminClient()
  const { error: checkError } = await sb.from("gallery_custom").select("id").limit(1)
  if (checkError) {
    return NextResponse.json(
      {
        ok: false,
        error: isMissingTable(checkError)
          ? "Table gallery_custom does not exist yet - run migration 020_gallery_custom.sql first."
          : checkError.message,
      },
      { status: isMissingTable(checkError) ? 503 : 502 },
    )
  }

  const { data: maxRow } = await sb
    .from("gallery_custom")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()
  let nextOrder = (maxRow?.sort_order ?? -1) + 1

  const saved: unknown[] = []
  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const path = `${crypto.randomUUID()}.${ext}`
    const { error: uploadError } = await sb.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false })
    if (uploadError) {
      return NextResponse.json(
        { ok: false, error: `Upload failed: ${uploadError.message}`, uploaded: saved.length },
        { status: 502 },
      )
    }
    const imageUrl = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
    const id = `${category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "photo"}-${Date.now().toString(36)}-${saved.length}`
    const { data: row, error: insertError } = await sb
      .from("gallery_custom")
      .insert({ id, image_url: imageUrl, label, category, sort_order: nextOrder, visible: true })
      .select(SELECT)
      .single()
    if (insertError) {
      return NextResponse.json({ ok: false, error: `Save failed: ${insertError.message}`, uploaded: saved.length }, { status: 502 })
    }
    saved.push(row)
    nextOrder += 1
  }
  return NextResponse.json({ ok: true, photos: saved })
}

// PATCH { id, label?, category?, sort_order?, visible? } - edit.
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
  if (body?.label !== undefined) patch.label = String(body.label)
  if (body?.category !== undefined) {
    if (!VALID_CATEGORIES.has(String(body.category))) {
      return NextResponse.json({ ok: false, error: "Unknown category" }, { status: 400 })
    }
    patch.category = String(body.category)
  }
  if (body?.visible !== undefined) patch.visible = body.visible === true
  if (body?.sort_order !== undefined) {
    const n = Number(body.sort_order)
    if (!Number.isFinite(n)) return NextResponse.json({ ok: false, error: "sort_order must be a number" }, { status: 400 })
    patch.sort_order = n
  }

  const sb = createSupabaseAdminClient()
  const { error } = await sb.from("gallery_custom").update(patch).eq("id", id)
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}

// DELETE ?id=... - removes the row and its Storage file.
export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const id = new URL(request.url).searchParams.get("id")?.trim() || ""
  if (!id) {
    return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 })
  }
  const sb = createSupabaseAdminClient()
  const { data: row } = await sb.from("gallery_custom").select("image_url").eq("id", id).maybeSingle()
  const { error } = await sb.from("gallery_custom").delete().eq("id", id)
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 })
  }
  if (row?.image_url) {
    const marker = `/${BUCKET}/`
    const idx = row.image_url.indexOf(marker)
    if (idx !== -1) {
      await sb.storage.from(BUCKET).remove([row.image_url.slice(idx + marker.length)]).catch(() => {})
    }
  }
  return NextResponse.json({ ok: true })
}
