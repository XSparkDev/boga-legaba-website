import { HomeHero } from "@/components/home/hero"
import { StatsBar } from "@/components/stats-bar"
import { PropertyOverview } from "@/components/property-overview"
import { WhatsAppSection } from "@/components/home/whatsapp-section"
import { WhySection } from "@/components/home/why-section"
import { ReviewsSection } from "@/components/home/reviews-section"
import { getSiteImageOverrides, resolveSiteImageFrom } from "@/lib/site-images-live"

export default async function HomePage() {
  // Resolve the 5 hero slideshow slots (admin-editable, default to the built-in
  // /boga_hero_ images) on the server, then hand them to the client HomeHero.
  const overrides = await getSiteImageOverrides()
  const heroSlides = [1, 2, 3, 4, 5].map((n) => resolveSiteImageFrom(overrides, `hero.slide.${n}`))
  const heroImages = heroSlides.map((s) => s.url)
  const heroAlt = heroSlides[0]?.alt || "Boga Legaba guest house"

  return (
    <main>
      <HomeHero images={heroImages} alt={heroAlt} />
      <StatsBar />
      <PropertyOverview />
      <WhySection />
      <ReviewsSection />
      <WhatsAppSection />
    </main>
  )
}
