import type { Metadata } from "next"
import { StayPageHeader } from "@/components/stay/stay-page-header"
import { StayRooms } from "@/components/stay/stay-rooms"
import { NightsBridgeEmbed } from "@/components/nightsbridge-embed"

export const metadata: Metadata = {
  title: "Stay & Rooms | Boga Legaba Guest House, Mahikeng",
  description:
    "27 rooms across 3 properties in Mahikeng. Browse Chababa, Interlaken A, Lantana and Transnet portfolio rooms by configuration and bathroom type. Book directly.",
}

export default function StayPage() {
  return (
    <main>
      <StayPageHeader />
      <StayRooms />
      <NightsBridgeEmbed />
    </main>
  )
}
