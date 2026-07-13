import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { getRoomImagesByBbroomid } from "@/lib/room-images"

export const dynamic = "force-dynamic"

async function isAuthenticated() {
  const store = await cookies()
  return store.get("bl_admin_session")?.value === process.env.ADMIN_SECRET
}

const BUCKET = "room-images"

// GET ?bbroomid=123 — list a room's images, ordered for the admin gallery editor.
export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const bbroomid = Number(new URL(request.url).searchParams.get("bbroomid"))
  if (!Number.isFinite(bbroomid)) {
    return NextResponse.json({ ok: false, error: "Invalid bbroomid" }, { status: 400 })
  }
  const images = await getRoomImagesByBbroomid(bbroomid)
  return NextResponse.json({ ok: true, images })
}

// POST multipart/form-data: file, bbroomid, title? — uploads to Storage, then
// records the row. Uploads go through this server route (not the browser
// talking to Supabase directly) because admin auth here is a plain session
// cookie, not a Supabase Auth session, so the browser has no credential that
// Storage RLS would accept for a write.
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const form = await request.formData()
  const file = form.get("file")
  const bbroomid = Number(form.get("bbroomid"))
  const title = (form.get("title") as string | null)?.trim() || null

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "file is required" }, { status: 400 })
  }
  if (!Number.isFinite(bbroomid)) {
    return NextResponse.json({ ok: false, error: "Invalid bbroomid" }, { status: 400 })
  }

  const sb = createSupabaseAdminClient()

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const path = `${bbroomid}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await sb.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false })
  if (uploadError) {
    return NextResponse.json({ ok: false, error: `Upload failed: ${uploadError.message}` }, { status: 502 })
  }

  const { data: publicUrlData } = sb.storage.from(BUCKET).getPublicUrl(path)

  // New image goes to the end of the gallery by default.
  const existing = await getRoomImagesByBbroomid(bbroomid)
  const nextOrder = existing.length ? Math.max(...existing.map((i) => i.display_order)) + 1 : 0

  const { data: row, error: insertError } = await sb
    .from("room_images")
    .insert({ bbroomid, image_url: publicUrlData.publicUrl, title, display_order: nextOrder })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ ok: false, error: `Save failed: ${insertError.message}` }, { status: 502 })
  }

  return NextResponse.json({ ok: true, image: row })
}

// PATCH { id, title?, display_order?, bbroomid? } — edit a caption, reorder,
// or move an image to a different room.
export async function PATCH(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const body = await request.json().catch(() => null) as { id?: string; title?: string; display_order?: number; bbroomid?: number } | null
  if (!body?.id) {
    return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 })
  }

  const patch: Record<string, unknown> = {}
  if (typeof body.title === "string") patch.title = body.title.trim() || null
  if (typeof body.display_order === "number") patch.display_order = body.display_order
  if (typeof body.bbroomid === "number") patch.bbroomid = body.bbroomid
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "Nothing to update" }, { status: 400 })
  }

  const sb = createSupabaseAdminClient()
  const { error } = await sb.from("room_images").update(patch).eq("id", body.id)
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}

// DELETE ?id=... — removes both the DB row and the underlying Storage file.
export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const id = new URL(request.url).searchParams.get("id")
  if (!id) {
    return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 })
  }

  const sb = createSupabaseAdminClient()
  const { data: row } = await sb.from("room_images").select("image_url").eq("id", id).maybeSingle()

  const { error } = await sb.from("room_images").delete().eq("id", id)
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 })
  }

  if (row?.image_url) {
    // Best-effort: the DB row is already gone, which is what matters for the
    // gallery — an orphaned Storage file is cheap and doesn't need to block
    // the response if this fails.
    const marker = `/${BUCKET}/`
    const idx = row.image_url.indexOf(marker)
    if (idx !== -1) {
      const path = row.image_url.slice(idx + marker.length)
      await sb.storage.from(BUCKET).remove([path]).catch(() => {})
    }
  }

  return NextResponse.json({ ok: true })
}
