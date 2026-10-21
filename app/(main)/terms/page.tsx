import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage, LegalSection, Todo } from "@/components/legal/legal-page"
import { SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Terms of Use | Boga Legaba Guest House & Conference Centre, Mahikeng",
  description:
    "The terms governing use of the Boga Legaba website: acceptable use, content ownership, availability and rates, and limitation of liability.",
  alternates: { canonical: `${SITE_URL}/terms` },
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      subtitle="The basic rules for using the Boga Legaba website."
      updated="October 2026"
    >
      <LegalSection title="Acceptance">
        <p>
          By using this website you agree to these terms. If you do not agree, please do not use
          the site. <Todo>confirm these terms have been reviewed or adopted as the site&apos;s
          governing terms with Boga Legaba</Todo>
        </p>
      </LegalSection>

      <LegalSection title="What this website is for">
        <p>
          This website lets you explore our rooms, conference venue, dining offering and local area,
          check availability and rates, submit enquiries, and make reservations through our booking
          flow. Availability, rates and package details shown here can change - the confirmed
          details are those in your written quote, confirmation or reservation.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Submit false, misleading or someone else&apos;s information through our forms</li>
          <li>Attempt to disrupt, overload or gain unauthorised access to the site or its systems</li>
          <li>Copy, republish or commercially reuse site content without permission</li>
        </ul>
      </LegalSection>

      <LegalSection title="Content ownership">
        <p>
          Text, photographs, logos and design on this site belong to Boga Legaba or its content
          partners and may not be reused without written permission. Guest reviews shown on the
          site remain the property of their authors and the platforms they were posted on.
        </p>
      </LegalSection>

      <LegalSection title="Bookings, payments and cancellations">
        <p>
          Reservations, payments and cancellations are governed separately by our{" "}
          <Link href="/booking-terms" className="underline underline-offset-2">Booking Terms</Link>{" "}
          and <Link href="/cancellation-policy" className="underline underline-offset-2">Cancellation
          Policy</Link>, which form part of every reservation made through this site.
        </p>
      </LegalSection>

      <LegalSection title="External links">
        <p>
          Links to WhatsApp, Google, TripAdvisor, NightsBridge, Paystack and social platforms leave
          this site - their own terms and privacy policies apply there, and we are not responsible
          for their content or practices.
        </p>
      </LegalSection>

      <LegalSection title="Limitation of liability">
        <p>
          We work to keep the information on this site accurate and available, but it is provided
          without warranty. To the extent permitted by law, Boga Legaba is not liable for loss
          arising from reliance on site content or from interruptions to the site.{" "}
          <Todo>confirm liability wording and governing law with Boga Legaba&apos;s legal advice</Todo>
        </p>
      </LegalSection>

      <LegalSection title="Privacy">
        <p>
          How we handle your personal information is set out in our{" "}
          <Link href="/privacy" className="underline underline-offset-2">Privacy Notice</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
