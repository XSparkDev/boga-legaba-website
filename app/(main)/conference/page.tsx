import type { Metadata } from "next"
import { Users, Projector, UtensilsCrossed, BedDouble, Wifi, ParkingCircle, LayoutGrid, MessageCircle, Check } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { SiteImage } from "@/components/site-image"
import { resolveSiteImage } from "@/lib/site-images-live"
import { ConferencePackages } from "@/components/conference/conference-packages"
import { ConferenceForm } from "@/components/forms/conference-form"
import { Reveal } from "@/components/reveal"

export const metadata: Metadata = {
  title: "Conference Venue in Mahikeng | Boga Legaba Conference Centre",
  description:
    "Host your next event at Boga Legaba in Mahikeng. Conference venue for up to 80 delegates with full AV, catering, accommodation and central location. Submit a conference enquiry.",
}

const FEATURES = [
  { Icon: Users, label: "Capacity", note: "Up to 80 delegates" },
  { Icon: Projector, label: "AV Equipment", note: "Projector, screen, PA" },
  { Icon: UtensilsCrossed, label: "Catering", note: "Half & full day packages" },
  { Icon: BedDouble, label: "Accommodation", note: "On-site rooms" },
  { Icon: Wifi, label: "Wi-Fi", note: "High-speed throughout" },
  { Icon: ParkingCircle, label: "Parking", note: "Secure on-site" },
  { Icon: LayoutGrid, label: "Setup Styles", note: "Theatre to boardroom" },
]

export default async function ConferencePage() {
  const conferenceImage = await resolveSiteImage("conference")
  return (
    <main>
      <PageHeader
        eyebrow="Conference Venue"
        title="Host Your Next Event at Boga Legaba"
        subtitle="Up to 80 delegates. Full AV. Catering. A central Mahikeng location built for productive business gatherings."
      />

      {/* Image + features */}
      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative aspect-[21/9] w-full overflow-hidden rounded-2xl">
              <SiteImage
                src={conferenceImage.url}
                alt={`Conference room at Boga Legaba Lantana: ${conferenceImage.alt}`}
                fill
                sizes="(max-width: 1280px) 100vw, 1280px"
              />
            </div>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {FEATURES.map(({ Icon, label, note }, i) => (
              <Reveal as="div" key={label} delay={i * 60}>
                <div className="flex h-full flex-col gap-2 rounded-xl border border-border bg-card p-5">
                  <Icon className="size-6 text-gold" />
                  <span className="font-serif text-lg text-foreground">{label}</span>
                  <span className="text-xs text-muted-foreground">{note}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Enquiry form */}
      <section id="conference-enquiry" className="scroll-mt-24 bg-warm-white py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-10 text-center">
            <h2 className="text-balance font-display text-3xl font-bold text-foreground sm:text-4xl">
              Submit a Conference Enquiry
            </h2>
            <p className="mt-3 text-pretty leading-relaxed text-muted-foreground font-body">
              Tell us about your event and our team will tailor a proposal for you.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-2xl overflow-hidden shadow-card-hover">
            <div className="relative flex flex-col justify-between bg-[#000000] p-6 grain sm:p-8 lg:p-10">
              <div className="relative z-[2]">
                <span className="section-label">Why Host Here</span>
                <h3 className="font-display text-3xl text-white leading-tight mb-8">
                  Your event, handled professionally.
                </h3>
                {[
                  "Up to 80 delegates, fully equipped",
                  "Full AV, projector & PA system included",
                  "On-site catering, half day to residential",
                  "Accommodation for all delegates on-site",
                  "Central Mahikeng location, easy access",
                ].map((point, i) => (
                  <div key={i} className="flex items-start gap-3 mb-4">
                    <Check className="size-4 shrink-0 text-gold mt-0.5" />
                    <span className="font-body text-sm text-white/80">{point}</span>
                  </div>
                ))}
              </div>
              <div className="relative z-[2] border-t border-white/10 pt-6 mt-6">
                <p className="font-mono text-[10px] tracking-widest text-white/40 uppercase mb-3">
                  Quick Enquiry
                </p>
                <a
                  href="tel:+27828757018"
                  className="font-body text-white hover:text-gold transition-colors text-sm block mb-2"
                >
                  +27 82 875 7018
                </a>
                <a
                  href="https://wa.me/27828757018?text=Hi%20Boga%20Legaba%2C%20I%27d%20like%20to%20enquire%20about%20Lantana%20(10%20Lantana)%20%26%20Conference."
                  target="_blank"
                  rel="noreferrer"
                  data-ga4-event="whatsapp_click"
                  data-ga4-label="Conference"
                  className="inline-flex items-center gap-2 btn-glass text-xs px-4 py-2"
                >
                  <MessageCircle className="size-4 shrink-0" /> WhatsApp Conference Team
                </a>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 lg:p-10">
              <ConferenceForm />
            </div>
          </div>
        </div>
      </section>

      <ConferencePackages />
    </main>
  )
}
