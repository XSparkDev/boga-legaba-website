import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { saveEnquiry, buildEnquiryGuestEmail, buildEnquiryStaffEmail, type EnquiryInput, type EnquiryType } from "@/lib/enquiries"

export const dynamic = "force-dynamic"

const VALID_TYPES: EnquiryType[] = ["conference", "corporate", "contact", "interest"]

/**
 * Public enquiry submit — used by the conference, corporate, contact, and
 * interest/subscribe forms. Saves the submission, then emails BOTH the person
 * who submitted (confirmation) and Boga Legaba staff (notification with full
 * details). Email failures never block the guest from seeing a success state —
 * the submission is already saved by the time we attempt to send.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 })
  }

  const type = String(body.type ?? "") as EnquiryType
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ ok: false, error: "Invalid enquiry type" }, { status: 400 })
  }

  const input: EnquiryInput = {
    type,
    name: String(body.name ?? ""),
    email: String(body.email ?? ""),
    phone: (body.phone as string) ?? undefined,
    entity: (body.entity as string) ?? undefined,
    message: (body.message as string) ?? undefined,
    details: (body.details as Record<string, unknown>) ?? {},
  }

  const result = await saveEnquiry(input)
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (resendKey && resendKey !== "re_REPLACE_ME") {
    const resend = new Resend(resendKey)
    const from = process.env.RESEND_FROM_EMAIL ?? "Boga Legaba <onboarding@resend.dev>"
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL ?? "bogalegaba@gmail.com"

    const guest = buildEnquiryGuestEmail(input)
    const staff = buildEnquiryStaffEmail(input)

    // Best-effort — the enquiry is already saved regardless of email outcome.
    await Promise.allSettled([
      resend.emails.send({ from, to: input.email, subject: guest.subject, html: guest.html }),
      resend.emails.send({ from, to: adminEmail, subject: staff.subject, html: staff.html }),
    ])
  }

  return NextResponse.json({ ok: true, id: result.id })
}
