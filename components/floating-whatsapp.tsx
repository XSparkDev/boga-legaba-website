"use client"

import { useState } from "react"
import { MessageCircle, X, Lock } from "lucide-react"
import Link from "next/link"
import { properties } from "@/data/rooms"

export function FloatingWhatsApp() {
  const [open, setOpen] = useState(false)
  const desks = properties.filter((p) => p.id !== "transnet")

  return (
    <>
      {/* WhatsApp property picker popup */}
      {open ? (
        <div className="fixed bottom-36 right-6 z-50 w-72 overflow-hidden rounded-2xl border border-black/10 bg-card shadow-2xl">
          <div className="flex items-center justify-between bg-[#000000] px-4 py-3">
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

      {/* Floating button stack — bottom-right corner */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-3">

        {/* WhatsApp button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Open WhatsApp chat options"
          className="w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg whatsapp-pulse hover:scale-110 transition-transform duration-200"
        >
          <MessageCircle className="size-7 text-white" />
        </button>

        {/* Admin login button — below WhatsApp */}
        <Link
          href="/admin"
          aria-label="Admin login"
          title="Admin"
          className="group w-10 h-10 bg-[#000000]/80 hover:bg-[#996948] rounded-full flex items-center justify-center shadow-md border border-white/10 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:border-[#996948]"
        >
          <Lock className="size-4 text-white/60 group-hover:text-white transition-colors" />
        </Link>
      </div>
    </>
  )
}
