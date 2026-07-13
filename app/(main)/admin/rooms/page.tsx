import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { properties } from "@/data/rooms"
import { RoomImagesClient, type AdminRoom } from "@/components/admin/room-images-client"

export const metadata: Metadata = {
  title: "Room Photos | Boga Legaba Admin",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

async function isAuthenticated() {
  const store = await cookies()
  return store.get("bl_admin_session")?.value === process.env.ADMIN_SECRET
}

/**
 * data/rooms.ts is the static per-room content catalog (names, descriptions,
 * grouped by property) but has no bbroomid — that only exists in the `room`
 * table, kept in sync by the NightsBridge sync worker. Join by room_name to
 * get each room's bbroomid for the image upload/fetch API.
 */
async function getRoomsWithIds(): Promise<AdminRoom[]> {
  const sb = createSupabaseAdminClient()
  const { data } = await sb.from("room").select("bbroomid, room_name, property_name")
  const idByName = new Map((data ?? []).map((r) => [r.room_name as string, r.bbroomid as number]))

  const rooms: AdminRoom[] = []
  for (const property of properties) {
    for (const room of property.rooms) {
      const bbroomid = idByName.get(room.name)
      if (bbroomid == null) continue // not yet synced from NightsBridge — nothing to attach images to yet
      rooms.push({ bbroomid, name: room.name, propertyName: property.name })
    }
  }
  return rooms
}

export default async function RoomsPage() {
  if (!(await isAuthenticated())) redirect("/admin/login")
  const rooms = await getRoomsWithIds()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-30 border-b border-white/10 bg-[#000000] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <Link href="/admin/dashboard" className="flex items-center gap-1 font-mono text-[11px] text-white/60 hover:text-white">
            <ChevronLeft className="size-3.5" /> Dashboard
          </Link>
          <span className="font-serif text-base font-bold text-white">Room Photos</span>
          <span className="ml-auto font-mono text-[11px] text-white/40">{rooms.length} rooms</span>
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <p className="mb-6 font-mono text-[11px] text-gray-400">
          Upload photos for each room. Guests see these automatically once they select that room during booking.
        </p>
        <RoomImagesClient rooms={rooms} />
      </div>
    </div>
  )
}
