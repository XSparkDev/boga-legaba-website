import { Reveal } from "@/components/reveal"

const FEATURES = [
  { icon: "⊞", title: "Multiple Properties", desc: "Choose from 27 rooms across 3 distinct locations to suit your stay." },
  { icon: "◉", title: "Direct Bookings", desc: "Book instantly via NightsBridge — no agent fees, best available rates." },
  { icon: "◈", title: "Corporate Ready", desc: "Structured procurement workflows for government & business clients." },
  { icon: "◎", title: "Central Location", desc: "Easy access in Mahikeng, near government and business hubs." },
]

export function WhySection() {
  return (
    <section className="section-padding bg-sand">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <Reveal>
            <span className="section-label">Why Boga Legaba</span>
            <h2 className="font-display text-[clamp(36px,5vw,56px)] leading-[0.95] tracking-[-0.02em] text-[#000000] mb-6">
              Built for the way South Africans travel and do business.
            </h2>
            <p className="font-body text-base text-body-text leading-relaxed">
              We understand that business travel in South Africa means needing things done right — fast responses,
              proper invoices, reliable accommodation, and a venue that works as hard as you do.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <div className="space-y-0">
              {FEATURES.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-5 py-6 border-b border-[#000000]/10 last:border-0"
                >
                  <div className="w-10 h-10 rounded-full bg-[#000000] flex items-center justify-center flex-shrink-0 text-gold text-lg">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-body font-medium text-[#000000] mb-1">{item.title}</h4>
                    <p className="font-body text-sm text-taupe leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
