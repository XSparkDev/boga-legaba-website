import type { Metadata } from "next"
import { Mail, MessageCircle } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Reveal } from "@/components/reveal"
import { BUSINESS } from "@/data/rooms"

export const metadata: Metadata = {
  title: "FAQs | Boga Legaba Guest House & Conference Centre, Mahikeng",
  description:
    "Frequently asked questions about bookings, properties, check-in, conferences, corporate and government accommodation at Boga Legaba in Mahikeng.",
}

const CATEGORIES = [
  {
    title: "Booking & Reservations",
    faqs: [
      ["How do I make a booking?", "Book directly through our NightsBridge engine on the Book Now page, message us on WhatsApp, or call reception. Direct bookings get the best available rate."],
      ["Can I book via WhatsApp?", "Yes. Each property has a dedicated WhatsApp desk for quick quotes and booking assistance — use the floating WhatsApp button on any page."],
      ["What is the cancellation policy?", "Cancellation terms are confirmed at the time of booking and vary by rate and season. Our team will outline the applicable policy with your confirmation."],
      ["Do you accept walk-ins?", "Subject to availability, yes. We recommend booking ahead, especially during busy conference and government periods."],
    ],
  },
  {
    title: "Properties & Rooms",
    faqs: [
      ["What is the difference between 6 and 8 Interlaken?", "8 Interlaken is Chababa (10 rooms, double/twin focus) and 6 Interlaken is Interlaken A (6 rooms, family/triple focus). They are separate properties at different addresses."],
      ["Which properties are at different addresses?", "All three: Chababa at 8 Interlaken Avenue, Interlaken A at 6 Interlaken Avenue, and Lantana at 10 Lantana Street. Always confirm your arrival address when booking."],
      ["What bathroom options are available?", "Rooms are either Bath only, Shower only, or Bath & Shower. Each room card on the Stay page shows the exact configuration."],
    ],
  },
  {
    title: "Check-In & Check-Out",
    faqs: [
      ["What are check-in and check-out times?", "Standard check-in is from 14:00 and check-out by 10:00. Flexible timing can be arranged on request, subject to availability."],
      ["Is there 24-hour access?", "Yes, reception operates 24/7 and guests have round-the-clock access to their property."],
      ["Where do I go when I arrive?", "Proceed to the specific property address confirmed in your booking. Because our properties are at different addresses, please confirm before arrival."],
    ],
  },
  {
    title: "Conference & Events",
    faqs: [
      ["How many people can the conference venue accommodate?", "Our Lantana conference facility seats up to 80 delegates depending on the setup style (theatre, boardroom, U-shape, classroom or cocktail)."],
      ["Do you provide AV equipment?", "Yes — projector, screen, microphone, PA system and video conferencing are available. Specify your needs in the conference enquiry form."],
      ["Can I combine conference and accommodation?", "Absolutely. Our residential package bundles the full-day conference with on-site rooms and meals at a combined rate."],
    ],
  },
  {
    title: "Corporate & Government",
    faqs: [
      ["Do you issue tax invoices?", "Yes, we provide fully VAT-compliant tax invoices, integrated with Xero for clean reconciliation."],
      ["Do you support purchase orders?", "Yes, we accept and process PO-based bookings for corporate and government clients."],
      ["What are your government per diem rates?", "We honour government per diem rates for qualifying departments. Submit a corporate/government enquiry and our team will confirm applicable rates."],
    ],
  },
  {
    title: "Facilities & Services",
    faqs: [
      ["Is Wi-Fi available?", "Yes, high-speed Wi-Fi is available throughout all properties at no extra charge."],
      ["Is there parking?", "Yes, secure on-site parking is available at each property."],
      ["Do you serve breakfast?", "Breakfast is available and can be included with your rate or arranged on request."],
      ["Is the property pet-friendly?", "Please enquire ahead of booking — pet policies vary by property and room."],
    ],
  },
]

export default function FaqsPage() {
  return (
    <main>
      <PageHeader eyebrow="FAQs" title="Everything You Need to Know" subtitle="Quick answers to the questions our guests ask most." />

      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-12">
            {CATEGORIES.map((cat) => (
              <Reveal key={cat.title}>
                <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-taupe">{cat.title}</h2>
                <Accordion type="single" collapsible className="mt-3 rounded-xl border border-border bg-card px-5">
                  {cat.faqs.map(([q, a]) => (
                    <AccordionItem key={q} value={q}>
                      <AccordionTrigger className="font-serif text-base text-foreground sm:text-lg">{q}</AccordionTrigger>
                      <AccordionContent className="leading-relaxed text-muted-foreground">{a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#000000] py-14 text-white">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-bold sm:text-3xl">Still have questions?</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={BUSINESS.whatsappGeneral}
              target="_blank"
              rel="noreferrer"
              data-ga4-event="whatsapp_click"
              data-ga4-label="FAQs"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <MessageCircle className="size-4" /> Chat on WhatsApp
            </a>
            <a
              href={`mailto:${BUSINESS.email}`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-[#000000]"
            >
              <Mail className="size-4" /> {BUSINESS.email}
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
