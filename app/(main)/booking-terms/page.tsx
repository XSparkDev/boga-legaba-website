import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage, LegalSection, Todo } from "@/components/legal/legal-page"
import { SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Booking Terms | Boga Legaba Guest House & Conference Centre, Mahikeng",
  description:
    "Boga Legaba booking terms: payment, check-in and check-out times, inclusions, rates and how reservations are confirmed.",
  alternates: { canonical: `${SITE_URL}/booking-terms` },
}

export default function BookingTermsPage() {
  return (
    <LegalPage
      title="Booking Terms"
      subtitle="How reservations, payment, check-in and inclusions work at Boga Legaba."
      updated="October 2026"
    >
      <LegalSection title="Making a reservation">
        <p>
          Reservations can be made through this website&apos;s booking flow, by WhatsApp, phone or
          email, or via our reservation partner NightsBridge. A booking is confirmed only once you
          receive written confirmation from us. Quoted availability and rates are not a reservation
          until confirmed. <Todo>confirm accepted booking channels and what constitutes a binding
          confirmation with Boga Legaba</Todo>
        </p>
      </LegalSection>

      <LegalSection title="Payment">
        <p>
          Online bookings are payable by card or EFT through our payment provider at the time of
          booking, unless otherwise agreed in writing (for example approved corporate or
          purchase-order billing). Prices are in South African Rand and include VAT.{" "}
          <Todo>confirm accepted payment methods, when payment is due, purchase-order terms and
          VAT treatment with Boga Legaba</Todo>
        </p>
      </LegalSection>

      <LegalSection title="Check-in and check-out">
        <p>
          Standard check-in is from 14:00 and check-out is by 10:00, unless a different time is
          agreed when you book. Guests arriving outside reception hours should arrange access in
          advance. Our properties sit at different addresses - always confirm your arrival address
          before travelling. <Todo>confirm standard times, late check-out charges and
          after-hours arrival procedure with Boga Legaba</Todo>
        </p>
      </LegalSection>

      <LegalSection title="Inclusions and rates">
        <p>
          Unless your confirmation states otherwise, room rates cover the room for the stated
          dates and occupancy. Meals, conferencing, extras and services are charged as confirmed in
          your quote or reservation. Rates may vary by season, occupancy and meal plan.{" "}
          <Todo>confirm exactly what each rate includes (Wi-Fi, parking, breakfast, etc.) and how
          seasonal or occupancy-based rates work with Boga Legaba</Todo>
        </p>
      </LegalSection>

      <LegalSection title="Guest conduct and occupancy">
        <p>
          Rooms may not be occupied beyond the confirmed number of guests. Visitors, functions,
          smoking, pets and noise rules are as advised at the property. We may end a stay without
          refund where conduct endangers people, property or other guests&apos; reasonable enjoyment.{" "}
          <Todo>confirm house rules, visitor policy, smoking and pet policy with Boga Legaba</Todo>
        </p>
      </LegalSection>

      <LegalSection title="Changes and cancellations">
        <p>
          Date changes, cancellations, refunds, no-shows and deposits are governed by our{" "}
          <Link href="/cancellation-policy" className="underline underline-offset-2">Cancellation
          Policy</Link>, which forms part of these Booking Terms.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
