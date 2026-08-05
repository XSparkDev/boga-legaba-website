import type { Metadata } from "next"
import { Suspense } from "react"
import { StayPageHeader } from "@/components/stay/stay-page-header"
import { StayRooms } from "@/components/stay/stay-rooms"
import { StayBookingCta } from "@/components/stay/stay-booking-cta"
import { RoutePrefetcher } from "@/components/route-prefetcher"

export const metadata: Metadata = {
  title: "Stay & Rooms | Boga Legaba Guest House, Mahikeng",
  description:
    "Browse rooms and live availability across Boga Legaba properties in Mahikeng. Inventory synced from NightsBridge.",
}

export default function StayPage() {
  return (
    <main>
      <StayPageHeader />
      <Suspense>
        <StayRooms />
      </Suspense>
      <StayBookingCta />
      <RoutePrefetcher />
    </main>
  )
}
