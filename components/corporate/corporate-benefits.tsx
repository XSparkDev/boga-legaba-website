"use client"

import type { LucideIcon } from "lucide-react"
import { FileCheck2, FileText, CreditCard, Landmark, Layers, UserCog } from "lucide-react"
import { SBD_FORMS_ENABLED } from "@/lib/sbd-forms"
import { scrollToElement } from "@/lib/smooth-scroll"

const BENEFITS: {
  Icon: LucideIcon
  title: string
  body: string
  sbdAction?: boolean
}[] = [
  { Icon: FileText, title: "Tax Invoices & VAT", body: "Fully VAT-compliant invoicing, Xero-integrated for clean reconciliation." },
  { Icon: FileCheck2, title: "Purchase Order Support", body: "We accept and process PO-based bookings for corporate and government." },
  {
    Icon: Landmark,
    title: "Government Per Diem",
    body: "Government per diem rates honoured for qualifying departments.",
    sbdAction: true,
  },
  { Icon: UserCog, title: "Dedicated Account Management", body: "A single point of contact for all your bookings and queries." },
  { Icon: Layers, title: "Multi-Room Block Bookings", body: "Reserve multiple rooms across properties for teams and projects." },
  { Icon: CreditCard, title: "Credit Account Facility", body: "Credit accounts available for qualifying organisations." },
]

export function CorporateBenefits() {
  function scrollToForm() {
    window.dispatchEvent(new CustomEvent("corporate-select-per-diem"))
    scrollToElement("corporate-enquiry")
    window.setTimeout(() => {
      scrollToElement("sbd-form-generator", { block: "nearest" })
    }, 350)
  }

  return (
    <div>
      <h2 className="font-serif text-2xl text-foreground sm:text-3xl">Why Boga Legaba for Corporate &amp; Government</h2>
      <div className="mt-6 flex flex-col gap-4">
        {BENEFITS.map(({ Icon, title, body, sbdAction }) => (
          <div key={title} className="flex gap-4 rounded-xl border border-border bg-card p-5">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#000000] text-gold">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-foreground">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              {sbdAction ? (
                <button
                  type="button"
                  disabled={!SBD_FORMS_ENABLED}
                  onClick={scrollToForm}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gold/35 bg-gold/10 px-3 py-2 text-xs font-medium text-foreground transition-all hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  <FileText className="size-3.5 text-gold" />
                  Auto-generate SBD Forms
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
