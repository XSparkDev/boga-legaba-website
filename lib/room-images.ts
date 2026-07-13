import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export interface RoomImage {
  id: string
  bbroomid: number
  image_url: string
  title: string | null
  display_order: number
  created_at: string
}

/** Photos uploaded for a specific physical room, ordered for gallery display. */
export async function getRoomImagesByBbroomid(bbroomid: number): Promise<RoomImage[]> {
  try {
    const sb = createSupabaseAdminClient()
    const { data, error } = await sb
      .from("room_images")
      .select("id, bbroomid, image_url, title, display_order, created_at")
      .eq("bbroomid", bbroomid)
      .order("display_order", { ascending: true })
    if (error || !data) return []
    return data as RoomImage[]
  } catch {
    return []
  }
}

/**
 * Same lookup, but by the room's name (e.g. "Flutes") — the public booking
 * flow knows room names (from data/rooms.ts), not bbroomid, so this resolves
 * the id via the `room` table (kept in sync by the NightsBridge sync worker)
 * before reading images.
 */
export async function getRoomImagesByRoomName(roomName: string): Promise<RoomImage[]> {
  try {
    const sb = createSupabaseAdminClient()
    const { data: room, error: roomError } = await sb
      .from("room")
      .select("bbroomid")
      .eq("room_name", roomName)
      .maybeSingle()
    if (roomError || !room) return []
    return getRoomImagesByBbroomid(room.bbroomid as number)
  } catch {
    return []
  }
}
