"use client"

import { useState } from "react"
import { MessageCircle, X } from "lucide-react"
import { properties } from "@/data/rooms"

export function FloatingWhatsApp() {
  const [open, setOpen] = useState(false)
  const desks = properties.filter((p) => p.id !== "transnet")

  return (
    <>
      {open ? (
        <div className="fixed bottom-24 right-6 z-50 w-72 overflow-hidden rounded-2xl border border-black/10 bg-card shadow-2xl">
          <div className="flex items-center justify-between bg-[#0a0a0a] px-4 py-3">
            <p className="font-display text-sm text-white">Chat with which property?</p>
            <button onClick={() => setOpen(false)} aria-label="Close" className="text-white/70 hover:text-white">
              <X className="size-4" />
            </button>
          </div>
          <ul className="divide-y divide-border">
            {desks.map((p) => (
              <li key={p.id}>
                <a
                  href={p.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  data-ga4-event="whatsapp_click"
                  data-ga4-label={p.name}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary"
                >
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: p.colorHex }} aria-hidden="true" />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{p.name}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {p.code}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open WhatsApp chat options"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg whatsapp-pulse hover:scale-110 transition-transform duration-200"
      >
        <MessageCircle className="size-7 text-white" />
      </button>
    </>
  )
}
