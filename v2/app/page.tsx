import { HeroSection } from '@v2/components/home/hero-section'
import { StatsBar } from '@v2/components/home/stats-bar'
import { PropertiesSection } from '@v2/components/home/properties-section'
import { FeaturedRooms } from '@v2/components/home/featured-rooms'
import { WhatsAppSection } from '@v2/components/home/whatsapp-section'
import { WhyChoose } from '@v2/components/home/why-choose'
import { Testimonials } from '@v2/components/home/testimonials'
import { CtaBand } from '@v2/components/cta-band'

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <div className="section-divider" aria-hidden />
      <StatsBar />
      <div className="section-divider-dots" aria-hidden />
      <PropertiesSection />
      <div className="section-divider" aria-hidden />
      <FeaturedRooms />
      <div className="section-divider-dots" aria-hidden />
      <WhatsAppSection />
      <div className="section-divider" aria-hidden />
      <WhyChoose />
      <div className="section-divider-dots" aria-hidden />
      <Testimonials />
      <div className="section-divider" aria-hidden />
      <CtaBand />
    </main>
  )
}
