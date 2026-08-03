import type { Metadata } from 'next'
import { PageHeader } from '@v2/components/page-header'
import { Reveal } from '@v2/components/reveal'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@v2/components/ui/accordion'

export const metadata: Metadata = {
  title: 'FAQs',
  description:
    'Frequently asked questions about staying at Boga Legaba Guest House Mahikeng: booking, check-in, parking, conference and corporate rates.',
}

const faqs = [
  {
    q: 'How do I make a booking?',
    a: 'Call us, message us on WhatsApp, or email reception and our team will confirm live availability and rates directly, no third-party booking fees.',
  },
  {
    q: 'What time is check-in and check-out?',
    a: 'Standard check-in is from 14:00 and check-out by 10:00. Early check-in or late check-out may be arranged subject to availability. Contact reception.',
  },
  {
    q: 'Is parking available?',
    a: 'Yes. Secure on-site parking is available at each property. Please mention vehicle details when booking if you need assistance.',
  },
  {
    q: 'Can you issue VAT invoices for corporate bookings?',
    a: 'Yes. We provide VAT-compliant tax invoices and support purchase orders, government per diem rates and block bookings for qualifying accounts.',
  },
  {
    q: 'Do you host conferences and events?',
    a: 'Our conference centre accommodates up to 80 delegates with professional AV and catering options. Visit the Conference page or contact us for a tailored quote.',
  },
  {
    q: 'Which property should I choose?',
    a: 'Chababa (10 rooms) and Interlaken A (6 rooms) are on Interlaken Avenue in Riviera Park. Lantana (7 rooms) is on Lantana Street. All share one booking team. Browse Stay to compare rooms.',
  },
]

export default function FaqsPage() {
  return (
    <main>
      <PageHeader
        label="FAQs"
        title="Questions answered."
        subtitle="Everything you need to know before your stay in Mahikeng."
      />

      <section className="bg-cream py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-6 md:px-8">
          <Reveal>
            <Accordion type="single" collapsible className="w-full space-y-3">
              {faqs.map((item, i) => (
                <AccordionItem
                  key={item.q}
                  value={`item-${i}`}
                  className="overflow-hidden rounded-2xl border border-warm-sand/60 bg-off-white px-5 shadow-[0_4px_24px_rgba(44,26,14,0.06)]"
                >
                  <AccordionTrigger className="py-5 text-left font-display text-lg italic text-deep-earth hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-brown">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>
    </main>
  )
}
