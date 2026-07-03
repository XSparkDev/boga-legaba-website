import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import {
  createRegistration,
  buildRegistrationGuestEmail,
  buildRegistrationStaffEmail,
  type RegistrationInput,
} from "@/lib/guest-registration"

export const dynamic = "force-dynamic"

/**
 * Public guest self-registration submit. No admin auth (guest-facing), but the
 * only thing it can do is insert one registration row via the server-side
 * service-role client — it cannot read or modify anything else.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 })
  }

  const input: RegistrationInput = {
    bookingid: body.bookingid != null ? Number(body.bookingid) : null,
    booking_ref: (body.booking_ref as string) ?? null,
    full_name: String(body.full_name ?? ""),
    email: (body.email as string) ?? null,
    phone: (body.phone as string) ?? null,
    home_address: (body.home_address as string) ?? null,
    nationality: (body.nationality as string) ?? null,
    id_or_passport: (body.id_or_passport as string) ?? null,
    date_of_birth: (body.date_of_birth as string) ?? null,
    vehicle_reg: (body.vehicle_reg as string) ?? null,
    num_guests: body.num_guests != null ? Number(body.num_guests) : null,
    guest_names: (body.guest_names as string) ?? null,
    emergency_contact_name: (body.emergency_contact_name as string) ?? null,
    emergency_contact_phone: (body.emergency_contact_phone as string) ?? null,
    purpose: (body.purpose as string) ?? null,
    signature_ack: Boolean(body.signature_ack),
  }

  const result = await createRegistration(input)

  if (result.ok) {
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey && resendKey !== "re_REPLACE_ME") {
      const resend = new Resend(resendKey)
      const from = process.env.RESEND_FROM_EMAIL ?? "Boga Legaba <onboarding@resend.dev>"
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL ?? "bogalegaba@gmail.com"

      const sends = [
        resend.emails.send({
          from,
          to: adminEmail,
          subject: `New Guest Registration – ${input.full_name}`,
          html: buildRegistrationStaffEmail(input),
        }),
      ]
      if (input.email) {
        sends.push(
          resend.emails.send({
            from,
            to: input.email,
            subject: "Registration Received – Boga Legaba",
            html: buildRegistrationGuestEmail(input),
          }),
        )
      }
      // Best-effort — the registration is already saved regardless of email outcome.
      await Promise.allSettled(sends)
    }
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
