import type { Metadata } from 'next'
import { PageHeader } from '@v2/components/page-header'
import { Reveal } from '@v2/components/reveal'
import { BookingWidget } from '@v2/components/booking-widget'

export const metadata: Metadata = {
  title: 'Book Your Stay',
  description:
    'Book directly at Boga Legaba Guest House Mahikeng for the best rates across Chababa, Interlaken A and Lantana.',
}

export default function BookNowPage() {
  return (
    <main>
      <PageHeader
        label="Direct Booking"
        title="Book your stay."
        subtitle="Online reservations are coming soon. Until then, our team can confirm availability and secure your room directly."
      />
      <section className="bg-cream py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-6 md:px-8">
          <Reveal>
            <BookingWidget />
          </Reveal>
        </div>
      </section>
    </main>
  )
}
