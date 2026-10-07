import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage, LegalSection, Todo } from "@/components/legal/legal-page"
import { SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Cancellation Policy | Boga Legaba Guest House & Conference Centre, Mahikeng",
  description:
    "Boga Legaba cancellation policy: cancellation deadlines, refunds, no-shows and deposits for accommodation and conference bookings.",
  alternates: { canonical: `${SITE_URL}/cancellation-policy` },
}

export default function CancellationPolicyPage() {
  return (
    <LegalPage
      title="Cancellation Policy"
      subtitle="Deadlines, refunds, no-shows and deposits for cancelling or changing a booking."
      updated="October 2026"
    >
      <LegalSection title="How to cancel or change a booking">
        <p>
          Contact us by WhatsApp, phone or email and quote your booking reference. A cancellation
          is effective only once we confirm it back to you in writing.{" "}
          <Todo>confirm accepted cancellation channels and notice requirements with Boga Legaba</Todo>
        </p>
      </LegalSection>

      <LegalSection title="Cancellation deadlines and charges">
        <p>
          Standard deadlines and the charges that apply at each stage are set out here once
          confirmed. <Todo>confirm the cancellation deadline tiers (e.g. days before arrival) and
          the charge or refund percentage at each tier with Boga Legaba</Todo>
        </p>
      </LegalSection>

      <LegalSection title="Refunds">
        <p>
          Where a refund is due, it is processed back to the original payment method within a
          stated number of business days. Booking or transaction fees charged by payment providers
          may be non-refundable. <Todo>confirm refund method, timelines and any non-refundable
          fees with Boga Legaba</Todo>
        </p>
      </LegalSection>

      <LegalSection title="No-shows">
        <p>
          If you do not arrive and have not cancelled in writing, the booking is treated as a
          no-show and the full stay may be charged with no refund. <Todo>confirm the no-show
          charge with Boga Legaba</Todo>
        </p>
      </LegalSection>

      <LegalSection title="Deposits">
        <p>
          Some bookings require a deposit to secure the reservation; the amount, due date and
          forfeiture terms are stated in your quote or confirmation. <Todo>confirm when deposits
          apply, amounts, due dates and forfeiture terms with Boga Legaba</Todo>
        </p>
      </LegalSection>

      <LegalSection title="Conference and group bookings">
        <p>
          Conference, event and multi-room block bookings may carry different deadlines and
          deposits linked to catering, venue and room-release commitments. These are stated in the
          written proposal or function agreement. <Todo>confirm conference and group cancellation
          terms with Boga Legaba</Todo>
        </p>
      </LegalSection>

      <LegalSection title="Related terms">
        <p>
          This policy forms part of our{" "}
          <Link href="/booking-terms" className="underline underline-offset-2">Booking Terms</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
