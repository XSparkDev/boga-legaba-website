'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { WhatsAppIcon } from './whatsapp-icon'
import { properties, waLink } from '@v2/data/site'
import { cn } from '@v2/lib/utils'

export function WhatsAppFloat() {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {/* Popup with 3 property options */}
      <div
        className={cn(
          'w-[270px] origin-bottom-right overflow-hidden rounded-2xl bg-off-white shadow-[0_12px_40px_rgba(44,26,14,0.25)] transition-all duration-300',
          open ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-90 opacity-0'
        )}
      >
        <div className="flex items-center justify-between bg-deep-earth px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-terracotta">
            Chat with a property
          </p>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="text-white/60 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-2">
          {properties
            .filter((p) => p.key !== 'transnet')
            .map((p) => (
              <a
                key={p.key}
                href={waLink(p.key, `Hello Boga Legaba, I'd like to enquire about ${p.name}.`)}
                target="_blank"
                rel="noopener noreferrer"
                data-ga4-event="whatsapp_click"
                data-ga4-property={p.key}
                data-cursor="whatsapp"
                className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 transition-colors hover:bg-warm-sand"
                style={{ borderLeft: `4px solid ${p.color}` }}
              >
                <div>
                  <p className="font-mono text-xs tracking-widest text-deep-earth">
                    {p.name.toUpperCase()}
                  </p>
                  <p className="text-[11px] text-muted-brown">{p.address}</p>
                </div>
                <WhatsAppIcon className="h-5 w-5 text-[#25d366]" />
              </a>
            ))}
        </div>
      </div>

      <button
        type="button"
        aria-label="Open WhatsApp menu"
        data-cursor="whatsapp"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_8px_24px_rgba(37,211,102,0.45)]',
          !open && 'breathe'
        )}
      >
        {open ? <X className="h-7 w-7" /> : <WhatsAppIcon className="h-7 w-7" />}
      </button>
    </div>
  )
}
