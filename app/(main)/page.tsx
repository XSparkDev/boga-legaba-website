import { HomeHero } from "@/components/home/hero"
import { StatsBar } from "@/components/stats-bar"
import { PropertyOverview } from "@/components/property-overview"
import { WhatsAppSection } from "@/components/home/whatsapp-section"
import { WhySection } from "@/components/home/why-section"

export default function HomePage() {
  return (
    <main>
      <HomeHero />
      <StatsBar />
      <PropertyOverview />
      <WhatsAppSection />
      <WhySection />
    </main>
  )
}
