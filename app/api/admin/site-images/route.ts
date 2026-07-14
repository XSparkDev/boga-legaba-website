import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { SITE_IMAGE_SLOTS, SITE_IMAGE_DEFAULTS } from "@/lib/site-image-slots"

export const dynamic = "force-dynamic"

/**
 * Admin-only management of the marketing-page image overrides (`site_images`
 * table + `site-images` storage bucket). Same `bl_admin_session` cookie auth as
 * every other admin route. Writes only ever touch the fixed set of known slot
 * keys (SITE_IMAGE_SLOTS), never arbitrary keys.
 */
const BUCKET = "site-images"
const VALID_KEYS = new Set(SITE_IMAGE_SLOTS.map((s) => s.key))

async function isAuthenticated() {
  const store = await cookies()
  return store.get("bl_admin_session")?.value === process.env.ADMIN_SECRET
}

// GET — current overrides as a map keyed by image_key.
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const sb = createSupabaseAdminClient()
  const { data, error } = await sb.from("site_images").select("image_key, image_url, alt, updated_at")
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 })
  }
  const overrides: Record<string, { image_url: string; alt: string | null; updated_at: string }> = {}
  for (const r of data ?? []) {
    overrides[r.image_key] = { image_url: r.image_url, alt: r.alt, updated_at: r.updated_at }
  }
  return NextResponse.json({ ok: true, overrides })
}

// POST multipart { file, key, alt? } — upload a replacement image for a slot.
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const form = await request.formData()
  const file = form.get("file")
  const key = (form.get("key") as string | null)?.trim() || ""
  const alt = (form.get("alt") as string | null)?.trim() || null

  if (!VALID_KEYS.has(key)) {
    return NextResponse.json({ ok: false, error: "Unknown image slot" }, { status: 400 })
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "file is required" }, { status: 400 })
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ ok: false, error: "File must be an image" }, { status: 400 })
  }

  const sb = createSupabaseAdminClient()
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const safeKey = key.replace(/[^a-z0-9]+/gi, "_")
  const path = `${safeKey}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await sb.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false })
  if (uploadError) {
    return NextResponse.json({ ok: false, error: `Upload failed: ${uploadError.message}` }, { status: 502 })
  }

  const { data: publicUrlData } = sb.storage.from(BUCKET).getPublicUrl(path)
  const image_url = publicUrlData.publicUrl
  // Keep the existing alt if the caller didn't supply one.
  const resolvedAlt = alt ?? SITE_IMAGE_DEFAULTS[key]?.alt ?? null

  const { error: upsertError } = await sb
    .from("site_images")
    .upsert({ image_key: key, image_url, alt: resolvedAlt, updated_at: new Date().toISOString() }, { onConflict: "image_key" })
  if (upsertError) {
    return NextResponse.json({ ok: false, error: `Save failed: ${upsertError.message}` }, { status: 502 })
  }

  return NextResponse.json({ ok: true, override: { image_url, alt: resolvedAlt } })
}

// PATCH { key, alt } — edit only the caption/alt of a slot (keeps the image).
export async function PATCH(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const body = (await request.json().catch(() => null)) as { key?: string; alt?: string } | null
  const key = body?.key?.trim() || ""
  if (!VALID_KEYS.has(key)) {
    return NextResponse.json({ ok: false, error: "Unknown image slot" }, { status: 400 })
  }
  const alt = (body?.alt ?? "").trim() || null

  const sb = createSupabaseAdminClient()
  // If there's already an override, just change its alt. Otherwise create one
  // that keeps the current default image but with the new caption.
  const { data: existing } = await sb.from("site_images").select("image_url").eq("image_key", key).maybeSingle()
  const image_url = existing?.image_url ?? SITE_IMAGE_DEFAULTS[key]?.url
  if (!image_url) {
    return NextResponse.json({ ok: false, error: "No image to caption" }, { status: 400 })
  }

  const { error } = await sb
    .from("site_images")
    .upsert({ image_key: key, image_url, alt, updated_at: new Date().toISOString() }, { onConflict: "image_key" })
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}

// DELETE ?key=... — revert a slot to its built-in default (removes the override
// row; the underlying Storage file is best-effort cleaned up).
export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const key = new URL(request.url).searchParams.get("key")?.trim() || ""
  if (!VALID_KEYS.has(key)) {
    return NextResponse.json({ ok: false, error: "Unknown image slot" }, { status: 400 })
  }

  const sb = createSupabaseAdminClient()
  const { data: row } = await sb.from("site_images").select("image_url").eq("image_key", key).maybeSingle()

  const { error } = await sb.from("site_images").delete().eq("image_key", key)
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 })
  }

  // Best-effort: remove the uploaded file from Storage (ignore failures).
  const url = row?.image_url ?? ""
  const marker = `/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx !== -1) {
    const storagePath = url.slice(idx + marker.length)
    await sb.storage.from(BUCKET).remove([storagePath]).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
