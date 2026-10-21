import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage, LegalSection, Todo } from "@/components/legal/legal-page"
import { SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Cookie Notice | Boga Legaba Guest House & Conference Centre, Mahikeng",
  description:
    "What cookies and analytics the Boga Legaba website actually uses: no advertising cookies, privacy-friendly production analytics, and third-party services.",
  alternates: { canonical: `${SITE_URL}/cookies` },
}

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Notice"
      subtitle="What this site stores on your device, what it measures, and what it doesn't."
      updated="October 2026"
    >
      <LegalSection title="The short version">
        <p>
          This website sets <strong>no advertising or tracking cookies of its own</strong>. We do
          not run third-party ad pixels, and we do not build advertising profiles of visitors.
        </p>
      </LegalSection>

      <LegalSection title="What the site itself uses">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Strictly necessary operation:</strong> the site needs basic technical storage
            to work (for example remembering an admin login session or a booking form draft on
            your own device). These are functional, not tracking.{" "}
            <Todo>confirm the exact functional storage used (admin session cookie,
            booking-draft storage) with Boga Legaba</Todo>
          </li>
          <li>
            <strong>Production analytics:</strong> in production we measure aggregate site usage
            and performance with Vercel Analytics. It is privacy-friendly analytics without
            advertising cookies and is not used to identify you personally.{" "}
            <Todo>confirm the analytics setup and whether anything beyond Vercel Analytics is in
            use with Boga Legaba</Todo>
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Third-party services">
        <p>
          Parts of the booking journey run on third-party platforms - NightsBridge (reservations
          and availability), Paystack (card and EFT payments), WhatsApp (chat links), and embedded
          content such as Google reviews or TripAdvisor references. Those platforms may set their
          own cookies under their own policies once you use them. We do not control those cookies.
        </p>
      </LegalSection>

      <LegalSection title="Managing cookies">
        <p>
          You can block or delete cookies at any time in your browser settings. Blocking strictly
          necessary storage may stop parts of the site (such as admin login or payment checkout)
          from working. See your browser&apos;s help pages for instructions.
        </p>
      </LegalSection>

      <LegalSection title="Related notices">
        <p>
          How we handle personal information more broadly is set out in our{" "}
          <Link href="/privacy" className="underline underline-offset-2">Privacy Notice</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
