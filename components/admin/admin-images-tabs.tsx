"use client"

import { useState } from "react"
import { ImageIcon, LayoutTemplate } from "lucide-react"
import { RoomImagesClient, type AdminRoom } from "@/components/admin/room-images-client"
import { SiteImagesClient } from "@/components/admin/site-images-client"

type Tab = "rooms" | "pages"

/**
 * Two-tab image manager for the admin: "Room Photos" (per physical room, the
 * existing editor) and "Page Images" (the fixed image slots on the marketing
 * pages). Kept as one client wrapper so both editors share a neat tab bar.
 */
export function AdminImagesTabs({ rooms }: { rooms: AdminRoom[] }) {
  const [tab, setTab] = useState<Tab>("rooms")

  return (
    <div>
      <div className="mb-6 inline-flex rounded-xl border border-gray-200 bg-white p-1">
        <TabButton active={tab === "rooms"} onClick={() => setTab("rooms")} icon={<ImageIcon className="size-3.5" />}>
          Room Photos
        </TabButton>
        <TabButton active={tab === "pages"} onClick={() => setTab("pages")} icon={<LayoutTemplate className="size-3.5" />}>
          Page Images
        </TabButton>
      </div>

      {tab === "rooms" ? (
        <>
          <p className="mb-6 font-mono text-[11px] text-gray-400">
            Upload photos for each room. Guests see these automatically once they select that room during booking.
          </p>
          <RoomImagesClient rooms={rooms} />
        </>
      ) : (
        <>
          <p className="mb-6 max-w-2xl font-mono text-[11px] leading-relaxed text-gray-400">
            Replace the images shown on the Home, Conference, Dining, Attractions, Specials and Gallery pages. Upload a
            new photo for any slot, or revert it back to the original. Changes appear on the live site automatically.
          </p>
          <SiteImagesClient />
        </>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-mono text-[11px] transition-colors ${
        active ? "bg-[#996948] text-white" : "text-gray-600 hover:bg-gray-50"
      }`}
    >
      {icon}
      {children}
    </button>
  )
}
