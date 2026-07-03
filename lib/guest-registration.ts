/**
 * Server-side data access for guest self-registration ("digital check-in").
 * Writes to the guest_registration table (migration 010) via the service-role
 * client. Fails soft if the table isn't applied yet.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export type RegistrationInput = {
  bookingid?: number | null
  booking_ref?: string | null
  full_name: string
  email?: string | null
  phone?: string | null
  home_address?: string | null
  nationality?: string | null
  id_or_passport?: string | null
  date_of_birth?: string | null
  vehicle_reg?: string | null
  num_guests?: number | null
  guest_names?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  purpose?: string | null
  signature_ack?: boolean
}

export type Registration = RegistrationInput & { id: number; submitted_at: string }

export async function createRegistration(
  input: RegistrationInput,
): Promise<{ ok: boolean; id?: number; error?: string }> {
  const full_name = (input.full_name ?? "").trim()
  if (!full_name) return { ok: false, error: "Full name is required" }

  try {
    const sb = createSupabaseAdminClient()
    const { data, error } = await sb
      .from("guest_registration")
      .insert({
        bookingid: input.bookingid ?? null,
        booking_ref: input.booking_ref ?? null,
        full_name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        home_address: input.home_address ?? null,
        nationality: input.nationality ?? null,
        id_or_passport: input.id_or_passport ?? null,
        date_of_birth: input.date_of_birth || null,
        vehicle_reg: input.vehicle_reg ?? null,
        num_guests: input.num_guests ?? null,
        guest_names: input.guest_names ?? null,
        emergency_contact_name: input.emergency_contact_name ?? null,
        emergency_contact_phone: input.emergency_contact_phone ?? null,
        purpose: input.purpose ?? null,
        signature_ack: Boolean(input.signature_ack),
      })
      .select("id")
      .single()
    if (error) {
      console.warn("[guest-registration] insert failed:", error.message)
      return { ok: false, error: "Could not save registration (is the migration applied?)" }
    }
    return { ok: true, id: (data as { id: number }).id }
  } catch (err) {
    console.warn("[guest-registration] error:", err)
    return { ok: false, error: "Registration service unavailable" }
  }
}

export async function listRegistrations(limit = 100): Promise<Registration[]> {
  try {
    const sb = createSupabaseAdminClient()
    const { data, error } = await sb
      .from("guest_registration")
      .select("*")
      .order("submitted_at", { ascending: false })
      .limit(limit)
    if (error) { console.warn("[guest-registration] list:", error.message); return [] }
    return (data as Registration[]) ?? []
  } catch (err) { console.warn("[guest-registration] list error:", err); return [] }
}
