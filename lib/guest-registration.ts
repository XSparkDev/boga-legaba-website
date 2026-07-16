/**
 * Server-side data access for guest self-registration ("digital check-in").
 * Writes to the guest_registration table (migration 010) via the service-role
 * client. Fails soft if the table isn't applied yet.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { emailShell, emailHero, emailInfoTable, emailParagraph, EMAIL_COLORS, type InfoRow } from "@/lib/email-theme"

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

// ── Emails ───────────────────────────────────────────────────────────────────

/** Guest-facing confirmation that their registration was received. */
export function buildRegistrationGuestEmail(input: RegistrationInput): string {
  const first = (input.full_name || "").trim().split(/\s+/)[0] || "Guest"
  const rows: InfoRow[] = [{ label: "Full Name", value: input.full_name }]
  if (input.booking_ref) rows.push({ label: "Booking Reference", value: input.booking_ref })
  if (input.num_guests) rows.push({ label: "Number of Guests", value: String(input.num_guests) })

  return emailShell({
    title: "Registration Received – Boga Legaba",
    eyebrow: "Digital Check-in",
    bodyHtml:
      emailHero({
        eyebrow: "Registration Received",
        heading: `Thank you, ${first}`,
        subtext: "Your registration details have been received. We look forward to welcoming you to Boga Legaba.",
      }) +
      emailInfoTable(rows, { title: "What you submitted" }) +
      emailParagraph(
        "If any of your details change before arrival, please contact us and we'll update your registration.",
      ),
  })
}

/** Staff notification with every field the guest submitted. */
export function buildRegistrationStaffEmail(input: RegistrationInput): string {
  const rows: InfoRow[] = [
    { label: "Full Name", value: input.full_name },
    { label: "Email", value: input.email || "N/A" },
    { label: "Phone", value: input.phone || "N/A" },
    { label: "Booking Reference", value: input.booking_ref || "N/A" },
    { label: "Home Address", value: input.home_address || "N/A" },
    { label: "Nationality", value: input.nationality || "N/A" },
    { label: "ID / Passport", value: input.id_or_passport || "N/A" },
    { label: "Date of Birth", value: input.date_of_birth || "N/A" },
    { label: "Vehicle Registration", value: input.vehicle_reg || "N/A" },
    { label: "Number of Guests", value: input.num_guests != null ? String(input.num_guests) : "N/A" },
    { label: "Names of All Guests", value: input.guest_names || "N/A" },
    { label: "Emergency Contact", value: input.emergency_contact_name || "N/A" },
    { label: "Emergency Contact Phone", value: input.emergency_contact_phone || "N/A" },
    { label: "Purpose of Visit", value: input.purpose || "N/A" },
  ]

  return emailShell({
    title: "New Guest Registration",
    eyebrow: "Admin Notification",
    bodyHtml:
      `<tr><td style="padding:32px 40px 8px;">
        <p style="margin:0 0 4px;color:${EMAIL_COLORS.muted};font-size:10px;text-transform:uppercase;letter-spacing:1.5px;">New Guest Registration</p>
        <p style="margin:0;color:${EMAIL_COLORS.black};font-size:22px;font-weight:400;font-family:'Playfair Display',Georgia,serif;">${input.full_name}</p>
      </td></tr>` +
      emailInfoTable(rows, { title: "Registration Details" }),
    footerNote: "Automated admin notification · Do not reply to this email.",
  })
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
