import type { Metadata } from 'next'
import { PageHeader } from '@v2/components/page-header'
import { StayBrowser } from '@v2/components/stay/stay-browser'
import { BookingWidget } from '@v2/components/booking-widget'
import { Reveal } from '@v2/components/reveal'

export const metadata: Metadata = {
  title: 'Stay: 27 Rooms Across 3 Properties',
  description:
    'Browse 27 rooms across Chababa, Interlaken A and Lantana, a guest house in Mahikeng with twin, double, family and triple configurations. Book directly for the best rate.',
}

export default function StayPage() {
  return (
    <main>
      <PageHeader
        label="Stay / Rooms"
        title="Find your room."
        subtitle="27 rooms across 3 distinct properties in Mahikeng. Each property is at a different address. Confirm yours at booking."
      />

      <StayBrowser />

      {/* Booking section */}
      <section className="bg-deep-earth">
        <div className="pattern-stripe" />
        <div className="diagonal-texture mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
          <Reveal>
            <h2 className="font-display text-4xl italic font-bold text-white md:text-5xl">
              Ready to book? Secure your room directly.
            </h2>
            <p className="mt-4 text-lg text-cream/70">
              Booking directly guarantees best rates, no OTA fees.
            </p>
          </Reveal>
          <Reveal delay={120} className="mt-10">
            <BookingWidget />
          </Reveal>
        </div>
      </section>
    </main>
  )
}
