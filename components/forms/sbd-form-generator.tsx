"use client"

import { useMemo } from "react"
import { FileText, Printer } from "lucide-react"
import { openHtmlInNewTab } from "@/lib/open-html-document"
import { SBD_FORMS_ENABLED } from "@/lib/sbd-forms"

export type SbdFormData = {
  contact: string
  entity: string
  email: string
  phone: string
  checkin: string
  checkout: string
  roomsRequired: string
  po: string
  billing: string
  requirements: string
}

const sbdForms = [
  {
    id: "sbd4",
    title: "SBD 4 — Declaration of Interest",
    summary: "Standard declaration for government and public-sector accommodation bookings.",
  },
  {
    id: "sbd61",
    title: "SBD 6.1 — Preference Points Claim",
    summary: "Preference points declaration where applicable to your department.",
  },
] as const

function buildSbdDocument(form: SbdFormData, sbdId: string, title: string) {
  const today = new Date().toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title} — ${form.entity || "Boga Legaba"}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 760px; margin: 40px auto; color: #111; line-height: 1.5; }
    h1 { font-size: 22px; margin-bottom: 8px; }
    h2 { font-size: 16px; margin-top: 28px; }
    .meta { font-size: 13px; color: #444; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    td { border: 1px solid #ccc; padding: 10px; vertical-align: top; font-size: 14px; }
    td.label { width: 34%; background: #f5f5f5; font-weight: 600; }
    .footer { margin-top: 40px; font-size: 12px; color: #666; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta">Generated ${today} · Boga Legaba Guest House &amp; Conference Centre · Government per diem enquiry</p>

  <h2>1. Supplier details</h2>
  <table>
    <tr><td class="label">Supplier</td><td>Boga Legaba Guest House &amp; Conference Centre</td></tr>
    <tr><td class="label">Contact</td><td>info@bogalegaba.co.za · +27 82 875 7018</td></tr>
  </table>

  <h2>2. Department / entity details</h2>
  <table>
    <tr><td class="label">Entity</td><td>${form.entity || "—"}</td></tr>
    <tr><td class="label">Contact person</td><td>${form.contact || "—"}</td></tr>
    <tr><td class="label">Email</td><td>${form.email || "—"}</td></tr>
    <tr><td class="label">Phone</td><td>${form.phone || "—"}</td></tr>
    <tr><td class="label">Billing contact</td><td>${form.billing || form.email || "—"}</td></tr>
    <tr><td class="label">PO number</td><td>${form.po || "To be confirmed"}</td></tr>
  </table>

  <h2>3. Accommodation request</h2>
  <table>
    <tr><td class="label">Check-in</td><td>${form.checkin || "—"}</td></tr>
    <tr><td class="label">Check-out</td><td>${form.checkout || "—"}</td></tr>
    <tr><td class="label">Rooms required</td><td>${form.roomsRequired || "—"}</td></tr>
    <tr><td class="label">Special requirements</td><td>${form.requirements || "None stated"}</td></tr>
  </table>

  ${
    sbdId === "sbd4"
      ? `<h2>4. Declaration of interest</h2>
  <p>I, <strong>${form.contact || "________________"}</strong>, representing <strong>${form.entity || "________________"}</strong>, declare that no member of the accounting authority / board / employees involved in this accommodation booking has any direct or indirect financial interest in Boga Legaba Guest House &amp; Conference Centre, other than as a guest or authorised traveller.</p>
  <p style="margin-top: 32px;">Signature: _________________________&nbsp;&nbsp;&nbsp;Date: ______________</p>`
      : `<h2>4. Preference points claim</h2>
  <p>The undersigned confirms that the information provided for this government per diem accommodation booking is accurate and that any applicable preference points will be claimed in line with the department&apos;s procurement policy.</p>
  <p style="margin-top: 32px;">Authorised signatory: _________________________&nbsp;&nbsp;&nbsp;Date: ______________</p>`
  }

  <p class="footer">This document was auto-generated from your corporate enquiry. Submit signed copies with your booking request.</p>
</body>
</html>`
}

export function SbdFormGenerator({ formData }: { formData: SbdFormData }) {
  const ready = useMemo(
    () => Boolean(formData.contact && formData.entity && formData.email),
    [formData.contact, formData.entity, formData.email],
  )

  function openForm(sbdId: string, title: string) {
    openHtmlInNewTab(buildSbdDocument(formData, sbdId, title))
  }

  return (
    <div id="sbd-form-generator" className="rounded-xl border border-gold/25 bg-gold/5 px-5 py-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
        Government per diem · SBD forms
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Generate standard procurement forms pre-filled with your enquiry details. Review, sign and return with your booking.
      </p>

      <div className="mt-4 space-y-3">
        {sbdForms.map((sbd) => (
          <div
            key={sbd.id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <FileText className="size-4 text-gold" />
                {sbd.title}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{sbd.summary}</p>
            </div>
            <button
              type="button"
              disabled={!SBD_FORMS_ENABLED || !ready}
              onClick={() => openForm(sbd.id, sbd.title)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[#000000] bg-[#000000] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-gold hover:text-[#000000] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Printer className="size-3.5" />
              Generate form
            </button>
          </div>
        ))}
      </div>

      {!ready ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Complete contact person, entity and email above to enable form generation.
        </p>
      ) : null}
    </div>
  )
}
