import { NextRequest, NextResponse } from "next/server"
import { getAllRoomImagesGrouped, getRoomImagesByBbroomid, getRoomImagesByRoomName } from "@/lib/room-images"

export const dynamic = "force-dynamic"

/**
 * Public read — the booking flow calls this once a guest selects a room, to
 * auto-display that room's photos. Accepts ?bbroomid=123, ?roomName=Flutes,
 * or no params at all (returns every room's images grouped by bbroomid —
 * used by the /stay room list so it isn't one request per room card).
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

  const byBbroomid = await getAllRoomImagesGrouped()
  return NextResponse.json({ ok: true, byBbroomid })
}
