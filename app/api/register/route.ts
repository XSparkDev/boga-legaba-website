import { NextRequest, NextResponse } from "next/server"
import { createRegistration, type RegistrationInput } from "@/lib/guest-registration"

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
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
