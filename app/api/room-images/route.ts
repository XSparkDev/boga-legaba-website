import { NextRequest, NextResponse } from "next/server"
import { getRoomImagesByBbroomid, getRoomImagesByRoomName } from "@/lib/room-images"

export const dynamic = "force-dynamic"

/**
 * Public read — the booking flow calls this once a guest selects a room, to
 * auto-display that room's photos. Accepts either ?bbroomid=123 or
 * ?roomName=Flutes (the guest-facing flow only knows room names).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const bbroomidParam = searchParams.get("bbroomid")
  const roomName = searchParams.get("roomName")

  if (bbroomidParam) {
    const bbroomid = Number(bbroomidParam)
    if (!Number.isFinite(bbroomid)) {
      return NextResponse.json({ ok: false, error: "Invalid bbroomid" }, { status: 400 })
    }
    const images = await getRoomImagesByBbroomid(bbroomid)
    return NextResponse.json({ ok: true, images })
  }

  if (roomName) {
    const images = await getRoomImagesByRoomName(roomName)
    return NextResponse.json({ ok: true, images })
  }

  return NextResponse.json({ ok: false, error: "bbroomid or roomName is required" }, { status: 400 })
}
