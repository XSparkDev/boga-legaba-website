"use client"

import Link from "next/link"
import { Facebook, Instagram, Linkedin, MessageCircle, Phone, Mail, Globe } from "lucide-react"
import { NightsBridgeModal } from "@/components/NightsBridgeModal"
import { SiteLogo } from "@/components/site-logo"
import { BUSINESS } from "@/data/rooms"
import { useBookingModal } from "@/hooks/useBookingModal"

const COLUMNS = [
  {
    title: "Quick Links",
    links: [
      { href: "/", label: "Home" },
      { href: "/stay", label: "Stay & Rooms" },
      { href: "/book-now", label: "Book Now" },
      { href: "/book-now", label: "Check Availability" },
      { href: "/specials", label: "Specials" },
      { href: "/gallery", label: "Gallery" },
    ],
  },
  {
    title: "Properties",
    links: [
      { href: "/stay", label: "Chababa: 8 Interlaken" },
      { href: "/stay", label: "Interlaken A: 6 Interlaken" },
      { href: "/stay", label: "Lantana: 10 Lantana" },
      { href: "/stay", label: "Transnet Portfolio" },
    ],
  },
  {
    title: "Services",
    links: [
      { href: "/conference", label: "Conference Venue" },
      { href: "/corporate", label: "Corporate & Government" },
      { href: "/dining", label: "Dining & Events" },
      { href: "/attractions", label: "Mahikeng Attractions" },
      { href: "/faqs", label: "FAQs" },
    ],
  },
]

export function SiteFooter() {
  const { isOpen, openModal, closeModal } = useBookingModal()

  return (
    <footer className="bg-[#000000] text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Link href="/" className="inline-block">
              <SiteLogo size="footer" />
            </Link>
            <p className="mt-5 max-w-xs text-pretty text-sm leading-relaxed text-white/60">
              Mahikeng&apos;s premier guest house and conference destination. Three unique properties, 27 rooms, one
              seamless experience.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {[
                { Icon: Facebook, label: "Facebook" },
                { Icon: Instagram, label: "Instagram" },
                { Icon: Linkedin, label: "LinkedIn" },
                { Icon: MessageCircle, label: "WhatsApp" },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="inline-flex size-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-gold hover:text-gold"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="font-mono text-xs uppercase tracking-widest text-gold">{col.title}</h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.label === "Check Availability" ? (
                      <button
                        type="button"
                        onClick={openModal}
                        className="text-sm text-white/65 transition-colors hover:text-white"
                      >
                        {link.label}
                      </button>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-white/65 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
              {col.title === "Services" ? (
                <div className="mt-6 space-y-2.5 text-sm text-white/65">
                  <a href={BUSINESS.phoneHref} className="flex items-center gap-2 hover:text-white">
                    <Phone className="size-4 text-gold" /> {BUSINESS.phone}
                  </a>
                  <a href={`mailto:${BUSINESS.email}`} className="flex items-center gap-2 hover:text-white">
                    <Mail className="size-4 text-gold" /> {BUSINESS.email}
                  </a>
                  <span className="flex items-center gap-2">
                    <Globe className="size-4 text-gold" /> {BUSINESS.website}
                  </span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-center text-xs text-white/50 sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <p>© {new Date().getFullYear()} Boga Legaba Guest House &amp; Conference Centre. All rights reserved.</p>
          <p className="font-mono tracking-wider text-white/50">
            <span className="uppercase">www.bogalegaba.co.za</span>
            <span className="mx-2 hidden text-white/30 sm:inline">·</span>
            <span className="mt-1 block normal-case sm:mt-0 sm:inline">
              Developed by{" "}
              <a
                href="https://www.xspark.co.za/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 transition-colors hover:text-white"
              >
                X Spark
              </a>
            </span>
          </p>
        </div>
      </div>
      <NightsBridgeModal isOpen={isOpen} onClose={closeModal} />
    </footer>
  )
}
