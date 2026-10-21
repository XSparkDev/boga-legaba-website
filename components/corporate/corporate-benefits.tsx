"use client"

import type { LucideIcon } from "lucide-react"
import { FileCheck2, FileText, Landmark, Layers, UserCog } from "lucide-react"

const BENEFITS: {
  Icon: LucideIcon
  title: string
  body: string
}[] = [
  { Icon: FileText, title: "Tax Invoices & VAT", body: "Fully VAT-compliant invoicing, Xero-integrated for clean reconciliation." },
  { Icon: FileCheck2, title: "Purchase Order Support", body: "We accept and process PO-based bookings for corporate and government." },
  {
    Icon: Landmark,
    title: "Government Per Diem",
    body: "Government per diem rates honoured for qualifying departments.",
  },
  { Icon: UserCog, title: "Dedicated Account Management", body: "A single point of contact for all your bookings and queries." },
  { Icon: Layers, title: "Multi-Room Block Bookings", body: "Reserve multiple rooms across properties for teams and projects." },
]

export function CorporateBenefits() {
  return (
    <div>
      <h2 className="font-serif text-2xl text-foreground sm:text-3xl">Why Boga Legaba for Corporate &amp; Government</h2>
      <div className="mt-6 flex flex-col gap-4">
        {BENEFITS.map(({ Icon, title, body }) => (
          <div key={title} className="flex gap-4 rounded-xl border border-border bg-card p-5">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#000000] text-gold">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-foreground">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
