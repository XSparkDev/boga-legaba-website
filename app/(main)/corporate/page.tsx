import type { Metadata } from "next"
import { PageHeader } from "@/components/page-header"
import { CorporateBenefits } from "@/components/corporate/corporate-benefits"
import { CorporateForm } from "@/components/forms/corporate-form"
import { Reveal } from "@/components/reveal"

export const metadata: Metadata = {
  title: "Corporate & Government Bookings | Boga Legaba Mahikeng",
  description:
    "Procurement-friendly corporate and government accommodation in Mahikeng. Tax invoices, purchase order support, government per diem rates and block bookings at Boga Legaba.",
}

export default function CorporatePage() {
  return (
    <main>
      <PageHeader
        eyebrow="Corporate & Government"
        title="Structured Booking Process for Corporate & Government Clients"
        subtitle="We understand procurement requirements. Our booking process is designed to make your administration easy."
        bgImage="/Organized/Property%202/lantana%20exterior/IMG_2780-HDR.jpg"
      />

      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          {/* Left: benefits */}
          <Reveal>
            <CorporateBenefits />
          </Reveal>

          {/* Right: form */}
          <div id="corporate-enquiry" className="scroll-mt-24">
            <Reveal delay={120}>
              <h2 className="mb-6 font-serif text-2xl text-foreground sm:text-3xl">Corporate / Government Enquiry</h2>
              <CorporateForm />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-[#000000] py-12 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-pretty text-lg leading-relaxed text-white/80">
            Boga Legaba is moving toward an <span className="text-gold">80% corporate</span> and{" "}
            <span className="text-gold">20% government</span> booking mix. We welcome long-term corporate account
            relationships.
          </p>
        </div>
      </section>
    </main>
  )
}
