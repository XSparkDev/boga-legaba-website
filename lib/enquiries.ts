/**
 * Lead-capture enquiries from the public site (conference, corporate, contact,
 * interest/subscribe forms). Saves to the `enquiry` table (migration 011) and
 * sends two emails per submission: a confirmation to the person who submitted,
 * and a notification to Boga Legaba staff — both built from the shared email
 * theme so they match the rest of the site.
 *
 * Fails soft if the table isn't applied yet (never blocks the guest-facing form).
 */
import { Resend } from "resend"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import {
  emailShell,
  emailHero,
  emailInfoTable,
  emailParagraph,
  emailButton,
  emailCallout,
  EMAIL_COLORS,
  EMAIL_BRAND,
  type InfoRow,
} from "@/lib/email-theme"

export type EnquiryType = "conference" | "corporate" | "contact" | "interest"

export interface EnquiryInput {
  type: EnquiryType
  name: string
  email: string
  phone?: string
  entity?: string
  message?: string
  details?: Record<string, unknown>
}

export async function saveEnquiry(input: EnquiryInput): Promise<{ ok: boolean; id?: number; error?: string }> {
  const name = (input.name ?? "").trim()
  const email = (input.email ?? "").trim()
  if (!name) return { ok: false, error: "Name is required" }
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "A valid email is required" }

  try {
    const sb = createSupabaseAdminClient()
    const { data, error } = await sb
      .from("enquiry")
      .insert({
        type: input.type,
        name,
        email,
        phone: input.phone ?? null,
        entity: input.entity ?? null,
        message: input.message ?? null,
        details: input.details ?? {},
      })
      .select("id")
      .single()
    if (error) {
      console.warn("[enquiries] insert failed:", error.message)
      return { ok: false, error: "Could not save enquiry (is the migration applied?)" }
    }
    return { ok: true, id: (data as { id: number }).id }
  } catch (err) {
    console.warn("[enquiries] error:", err)
    return { ok: false, error: "Enquiry service unavailable" }
  }
}

// ── Copy per enquiry type ──────────────────────────────────────────────────────

const TYPE_LABEL: Record<EnquiryType, string> = {
  conference: "Conference Enquiry",
  corporate: "Corporate / Government Enquiry",
  contact: "Contact Message",
  interest: "Interest Registration",
}

function firstNameOf(name: string) {
  return (name || "").trim().split(/\s+/)[0] || "there"
}

/** Guest-facing acknowledgement email — copy tailored to the enquiry type. */
export function buildEnquiryGuestEmail(input: EnquiryInput): { subject: string; html: string } {
  const first = firstNameOf(input.name)
  const d = input.details ?? {}

  if (input.type === "conference") {
    const rows: InfoRow[] = [
      { label: "Company / Organisation", value: input.entity || "N/A" },
      { label: "Preferred Date(s)", value: String(d.dates ?? "N/A") },
      { label: "Attendees", value: String(d.attendees ?? "N/A") },
    ]
    if (d.setup) rows.push({ label: "Setup Style", value: String(d.setup) })
    return {
      subject: "We've received your conference enquiry – Boga Legaba",
      html: emailShell({
        title: "Conference Enquiry Received – Boga Legaba",
        eyebrow: "Conference Enquiry",
        bodyHtml:
          emailHero({
            eyebrow: "Enquiry Received",
            heading: `Thank you, ${first}`,
            subtext: "Our conference team will respond within 2 business hours with availability and a quote.",
          }) +
          emailInfoTable(rows, { title: "Your enquiry" }) +
          emailParagraph(
            "In the meantime, feel free to reach out directly if you have any urgent questions.",
          ) +
          emailButton("WhatsApp Us", EMAIL_BRAND.whatsappHref),
      }),
    }
  }

  if (input.type === "corporate") {
    const rows: InfoRow[] = [
      { label: "Company / Department", value: input.entity || "N/A" },
      { label: "Booking Type", value: String(d.type ?? "N/A") },
      { label: "Check-in", value: String(d.checkin ?? "N/A") },
      { label: "Check-out", value: String(d.checkout ?? "N/A") },
      { label: "Rooms Required", value: String(d.rooms ?? "N/A") },
    ]
    return {
      subject: "We've received your enquiry – Boga Legaba",
      html: emailShell({
        title: "Corporate Enquiry Received – Boga Legaba",
        eyebrow: "Corporate / Government Enquiry",
        bodyHtml:
          emailHero({
            eyebrow: "Enquiry Received",
            heading: `Thank you, ${first}`,
            subtext: "Our team will respond within 2 business hours with rates and availability.",
          }) +
          emailInfoTable(rows, { title: "Your enquiry" }) +
          emailParagraph(
            "If this is a government per diem booking, please have your official order/PO number ready. Our team will guide you through the rest.",
          ) +
          emailButton("WhatsApp Us", EMAIL_BRAND.whatsappHref),
      }),
    }
  }

  if (input.type === "contact") {
    return {
      subject: "We've received your message – Boga Legaba",
      html: emailShell({
        title: "Message Received – Boga Legaba",
        eyebrow: "Contact",
        bodyHtml:
          emailHero({
            eyebrow: "Message Received",
            heading: `Thank you, ${first}`,
            subtext: "We've received your message and will get back to you as soon as possible.",
          }) +
          emailInfoTable(
            [
              { label: "Subject", value: String(d.subject ?? "General Enquiry") },
              { label: "Your Message", value: input.message || "N/A" },
            ],
            { title: "What you sent us" },
          ) +
          emailButton("WhatsApp Us", EMAIL_BRAND.whatsappHref),
      }),
    }
  }

  // interest
  const area = d.interest ? String(d.interest) : ""
  return {
    subject: "You're on the list – Boga Legaba",
    html: emailShell({
      title: "You're on the list – Boga Legaba",
      eyebrow: "Interest Registered",
      bodyHtml:
        emailHero({
          eyebrow: "You're on the list",
          heading: `Thank you, ${first}`,
          subtext: area
            ? `We'll be in touch with updates about ${area}.`
            : "We'll be in touch with updates and new offers.",
        }) +
        emailParagraph("In the meantime, feel free to browse our latest specials and rooms on the website."),
    }),
  }
}

/** Staff notification email — every field the guest submitted, all types. */
export function buildEnquiryStaffEmail(input: EnquiryInput): { subject: string; html: string } {
  const d = input.details ?? {}
  const rows: InfoRow[] = [
    { label: "Name", value: input.name },
    { label: "Email", value: input.email },
    { label: "Phone", value: input.phone || "N/A" },
  ]
  if (input.entity) rows.push({ label: "Company / Entity", value: input.entity })

  if (input.type === "conference") {
    rows.push(
      { label: "Preferred Date(s)", value: String(d.dates ?? "N/A") },
      { label: "Attendees", value: String(d.attendees ?? "N/A") },
      { label: "Setup Style", value: String(d.setup ?? "N/A") },
      { label: "AV Requirements", value: Array.isArray(d.av) && d.av.length ? d.av.join(", ") : "N/A" },
      { label: "Catering", value: Array.isArray(d.catering) && d.catering.length ? d.catering.join(", ") : "N/A" },
      { label: "Accommodation Needed", value: d.accommodation ? `Yes, ${d.rooms ?? "?"} room(s)` : "No" },
    )
  } else if (input.type === "corporate") {
    rows.push(
      { label: "Booking Type", value: String(d.type ?? "N/A") },
      { label: "Check-in", value: String(d.checkin ?? "N/A") },
      { label: "Check-out", value: String(d.checkout ?? "N/A") },
      { label: "Rooms Required", value: String(d.rooms ?? "N/A") },
      { label: "PO Number", value: String(d.po ?? "N/A") },
      { label: "Billing Contact", value: String(d.billing ?? "N/A") },
    )
  } else if (input.type === "contact") {
    rows.push({ label: "Subject", value: String(d.subject ?? "General Enquiry") })
  } else if (input.type === "interest") {
    rows.push({ label: "Interest Area", value: d.interest ? String(d.interest) : "N/A" })
    rows.push({ label: "Source Page", value: d.source ? String(d.source) : "N/A" })
  }

  return {
    subject: `New ${TYPE_LABEL[input.type]} – ${input.name}`,
    html: emailShell({
      title: `New ${TYPE_LABEL[input.type]}`,
      eyebrow: "Admin Notification",
      bodyHtml:
        `<tr><td style="padding:32px 40px 8px;">
          <p style="margin:0 0 4px;color:${EMAIL_COLORS.muted};font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">${TYPE_LABEL[input.type]}</p>
          <p style="margin:0;color:${EMAIL_COLORS.black};font-size:22px;font-weight:400;font-family:'Playfair Display',Georgia,serif;">${input.name}</p>
        </td></tr>` +
        emailInfoTable(rows, { title: "Details" }) +
        (input.message
          ? emailCallout(`<strong style="color:${EMAIL_COLORS.bodyText};">Message / Requirements</strong><br>${input.message}`)
          : ""),
      footerNote: "Automated admin notification · Do not reply to this email.",
    }),
  }
}
