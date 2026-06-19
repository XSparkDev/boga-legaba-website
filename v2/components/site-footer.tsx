'use client'

import Link from 'next/link'
import { NightsBridgeModal } from '@/components/NightsBridgeModal'
import { useBookingModal } from '@/hooks/useBookingModal'
import { v2Path } from '@v2/lib/paths'
import { Facebook, Instagram, Mail, Phone } from 'lucide-react'
import { Reveal } from '@v2/components/reveal'
import { WhatsAppIcon } from './whatsapp-icon'
import { SiteLogo } from './site-logo'
import { EMAIL, PHONE, WEBSITE, navLinks, properties } from '@v2/data/site'

export function SiteFooter() {
  const { isOpen, openModal, closeModal } = useBookingModal()

  return (
    <footer className="relative bg-deep-earth text-cream/80">
      <Reveal className="block w-full">
        <hr className="footer-dash-line mx-auto max-w-7xl w-full border-0" aria-hidden />
      </Reveal>
      <div className="diagonal-texture mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href={v2Path("/")}>
              <SiteLogo variant="light" className="h-16 md:h-24" />
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-cream/60">
              Mahikeng&apos;s most welcoming address. Three properties, 27 rooms, one team —
              built for business, designed for comfort.
            </p>
            <div className="mt-6 flex gap-3">
              {[Facebook, Instagram, Mail].map((Icon, i) => (
                <span
                  key={i}
                  data-cursor="social"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-deep-earth transition-colors hover:bg-cream"
                >
                  <Icon className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/70">
              Quick Links
            </p>
            <ul className="mt-5 space-y-2.5">
              {navLinks
                .concat([
                  { href: '/book-now', label: 'Book Now' },
                  { href: '/book-now', label: 'Check Availability' },
                ])
                .map((l) => (
                <li key={l.label}>
                  {l.label === 'Check Availability' ? (
                    <button
                      type="button"
                      onClick={openModal}
                      data-cursor="nav"
                      className="text-sm text-warm-sand/80 transition-colors hover:text-white"
                    >
                      {l.label}
                    </button>
                  ) : (
                    <Link
                      href={l.href}
                      data-cursor="nav"
                      className="text-sm text-warm-sand/80 transition-colors hover:text-white"
                    >
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/70">
              Properties
            </p>
            <ul className="mt-5 space-y-3">
              {properties.map((p) => (
                <li key={p.key} className="flex items-start gap-2.5">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ background: p.color }}
                  />
                  <div>
                    <p className="text-sm text-cream/90">{p.name}</p>
                    <p className="text-xs text-cream/50">{p.address}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/70">
              Contact
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-white/80" />
                <a href={`tel:${PHONE.replace(/\s/g, '')}`} className="hover:text-white">
                  {PHONE}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-white/80" />
                <a href={`mailto:${EMAIL}`} className="hover:text-white">
                  {EMAIL}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <WhatsAppIcon className="h-4 w-4 text-[#25d366]" />
                <a
                  href="https://wa.me/27828757018"
                  data-ga4-event="whatsapp_click"
                  data-cursor="whatsapp"
                  className="hover:text-white"
                >
                  WhatsApp us
                </a>
              </li>
            </ul>
            <p className="mt-5 text-xs leading-relaxed text-cream/50">
              Reception 24/7 · Conference Mon–Fri 8–5 · Accounts Mon–Fri 8–4
            </p>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-xs text-cream/50 md:flex-row md:items-center">
          <p>© 2026 Boga Legaba Guest House &amp; Conference Centre. All rights reserved.</p>
          <p className="font-mono tracking-widest uppercase">
            {WEBSITE} · Developed by{" "}
            <a
              href="https://www.xspark.co.za/"
              target="_blank"
              rel="noopener noreferrer"
              className="normal-case tracking-normal text-cream/70 transition-colors hover:text-white"
            >
              X Spark
            </a>
          </p>
        </div>
      </div>
      <NightsBridgeModal isOpen={isOpen} onClose={closeModal} />
    </footer>
  )
}
