import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage, LegalSection, Todo } from "@/components/legal/legal-page"
import { SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Privacy Notice | Boga Legaba Guest House & Conference Centre, Mahikeng",
  description:
    "How Boga Legaba collects, uses, stores and protects your personal information, your rights under POPIA, and how to contact us or lodge a complaint.",
  alternates: { canonical: `${SITE_URL}/privacy` },
  // Placeholder wording ([TODO] markers) - keep out of search results until
  // the client approves the content.
  robots: { index: false, follow: false },
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Notice"
      subtitle="How we collect, use and protect your personal information - and your rights under South Africa's Protection of Personal Information Act (POPIA)."
      updated="October 2026"
    >
      <LegalSection title="Who we are">
        <p>
          Boga Legaba Guest House &amp; Conference Centre, Mahikeng, North West Province, is the
          responsible party for the personal information described in this notice. <Todo>confirm
          registered business name, registration number and physical address with Boga Legaba</Todo>
        </p>
      </LegalSection>

      <LegalSection title="What personal information we collect">
        <p>Depending on how you interact with us, we may collect:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Name and surname</li>
          <li>Email address and phone number</li>
          <li>Company, department or government-entity details</li>
          <li>Booking dates, room requirements and arrival details</li>
          <li>Purchase order (PO) numbers and billing contacts, for corporate and government bookings</li>
          <li>Mailing-list subscriptions (name and email address where you opt in)</li>
          <li>Messages you send through our enquiry and contact forms</li>
        </ul>
        <p>
          Card payments are processed on our payment provider&apos;s own secure pages - card
          details are never entered on, or stored by, this website.
        </p>
      </LegalSection>

      <LegalSection title="Why we collect it">
        <p>We use your information only for the purpose you gave it to us:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>To answer enquiries and prepare quotes and proposals</li>
          <li>To make, confirm and administer bookings and stays</li>
          <li>To issue invoices and meet tax and record-keeping obligations</li>
          <li>To send mailing-list updates you have subscribed to (you can unsubscribe at any time)</li>
        </ul>
        <p>We do not sell your personal information and do not use it for unrelated marketing.</p>
      </LegalSection>

      <LegalSection title="Who we share it with">
        <p>
          We share information only where necessary to deliver the service you asked for: our
          reservation partner NightsBridge (bookings and availability), our transactional email
          provider (booking and enquiry emails), and our payment provider (card and EFT payments,
          processed on their own pages). <Todo>confirm the exact booking, email and payment
          providers to name here with Boga Legaba</Todo>
        </p>
        <p>
          Where you follow a link to a third party such as WhatsApp, Google, TripAdvisor or
          Paystack, that party&apos;s own privacy policy applies from that point. We may also
          disclose information where the law requires it.
        </p>
      </LegalSection>

      <LegalSection title="How we protect it">
        <p>
          This website is served over HTTPS so form submissions are encrypted in transit. Stored
          enquiry and booking records sit in access-controlled systems available only to authorised
          staff. <Todo>confirm internal access controls, device and backup practices with Boga
          Legaba</Todo>
        </p>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <p>
          We keep personal information only as long as needed for the purpose it was collected for,
          or as the law requires. <Todo>confirm retention periods (enquiries, booking records,
          invoices, mailing list) with Boga Legaba</Todo>
        </p>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>Under POPIA you may:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Ask what personal information we hold about you (access)</li>
          <li>Ask us to correct it where it is wrong (correction)</li>
          <li>Ask us to delete it, or stop using it, where the law allows (deletion and objection)</li>
          <li>Withdraw any consent you previously gave, such as a mailing-list subscription</li>
        </ul>
        <p>
          To exercise any of these rights, email{" "}
          <a href="mailto:info@bogalegaba.co.za" className="underline underline-offset-2">
            info@bogalegaba.co.za
          </a>{" "}
          or use our <Link href="/contact" className="underline underline-offset-2">contact page</Link>.
        </p>
      </LegalSection>

      <LegalSection title="Information Officer">
        <p>
          <Todo>confirm the appointed Information Officer&apos;s name and contact details with Boga
          Legaba</Todo>
        </p>
      </LegalSection>

      <LegalSection title="Complaints to the Information Regulator">
        <p>
          If you believe we have handled your information unlawfully, you may lodge a complaint
          with the Information Regulator of South Africa. <Todo>confirm current Regulator contact
          details and complaints procedure link with Boga Legaba</Todo>
        </p>
      </LegalSection>

      <LegalSection title="Related notices">
        <p>
          See also our Cookie Notice and Terms of Use.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
