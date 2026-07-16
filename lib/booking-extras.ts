/**
 * Server-side data access for app-owned booking extras: department flag,
 * invoices, and invoice line items. All stored in the NEW tables from
 * migration 009 — the `booking` table is never written to, only read/joined.
 *
 * Every function fails soft (returns null/empty and logs) if the tables don't
 * exist yet, so the rest of the app is unaffected until the migration is applied.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { Resend } from "resend"
import { emailShell, EMAIL_COLORS } from "@/lib/email-theme"

export type DepartmentFlag = {
  bookingid: number | null
  booking_ref: string | null
  is_department: boolean
  department_name: string | null
  po_number: string | null
  contact_person: string | null
}

export type InvoiceLineItem = {
  id: number
  invoice_id: number
  description: string
  quantity: number
  unit_price: number
  amount: number
}

export type Invoice = {
  id: number
  invoice_no: string
  bookingid: number | null
  booking_ref: string | null
  guest_name: string | null
  guest_email: string | null
  status: "draft" | "sent" | "paid" | "void"
  subtotal: number
  total: number
  currency: string
  notes: string | null
  issued_at: string | null
  created_at: string
  items?: InvoiceLineItem[]
}

// ── Department flag ──────────────────────────────────────────────────────────

export async function getDepartmentFlag(bookingid: number): Promise<DepartmentFlag | null> {
  try {
    const sb = createSupabaseAdminClient()
    const { data, error } = await sb
      .from("booking_department")
      .select("bookingid, booking_ref, is_department, department_name, po_number, contact_person")
      .eq("bookingid", bookingid)
      .maybeSingle()
    if (error) { console.warn("[booking-extras] getDepartmentFlag:", error.message); return null }
    return (data as DepartmentFlag) ?? null
  } catch (err) { console.warn("[booking-extras] getDepartmentFlag error:", err); return null }
}

export async function upsertDepartmentFlag(input: DepartmentFlag): Promise<boolean> {
  // Manual upsert (select → update/insert). We can't use Postgres ON CONFLICT here
  // because the uniqueness is enforced by PARTIAL unique indexes (bookingid / ref
  // where not null), which aren't valid ON CONFLICT targets.
  try {
    const sb = createSupabaseAdminClient()
    const now = new Date().toISOString()

    let existingId: number | null = null
    if (input.bookingid != null) {
      const { data } = await sb.from("booking_department").select("id").eq("bookingid", input.bookingid).maybeSingle()
      existingId = (data as { id: number } | null)?.id ?? null
    } else if (input.booking_ref) {
      const { data } = await sb.from("booking_department").select("id").eq("booking_ref", input.booking_ref).maybeSingle()
      existingId = (data as { id: number } | null)?.id ?? null
    }

    if (existingId != null) {
      const { error } = await sb.from("booking_department").update({ ...input, updated_at: now }).eq("id", existingId)
      if (error) { console.warn("[booking-extras] upsertDepartmentFlag update:", error.message); return false }
    } else {
      const { error } = await sb.from("booking_department").insert({ ...input })
      if (error) { console.warn("[booking-extras] upsertDepartmentFlag insert:", error.message); return false }
    }
    return true
  } catch (err) { console.warn("[booking-extras] upsertDepartmentFlag error:", err); return false }
}

/** bookingids (of the given set) that are flagged as department bookings. */
export async function getDepartmentBookingIds(bookingids: number[]): Promise<Set<number>> {
  if (bookingids.length === 0) return new Set()
  try {
    const sb = createSupabaseAdminClient()
    const { data, error } = await sb
      .from("booking_department")
      .select("bookingid")
      .in("bookingid", bookingids)
      .eq("is_department", true)
    if (error) { console.warn("[booking-extras] getDepartmentBookingIds:", error.message); return new Set() }
    return new Set((data ?? []).map((r) => Number(r.bookingid)))
  } catch (err) { console.warn("[booking-extras] getDepartmentBookingIds error:", err); return new Set() }
}

// ── Invoices + line items ────────────────────────────────────────────────────

async function nextInvoiceNo(): Promise<string> {
  try {
    const sb = createSupabaseAdminClient()
    const { count } = await sb.from("booking_invoice").select("id", { count: "exact", head: true })
    return `BL-INV-${String((count ?? 0) + 1).padStart(6, "0")}`
  } catch { return `BL-INV-${Date.now()}` }
}

export async function createInvoice(input: {
  bookingid?: number | null
  booking_ref?: string | null
  guest_name?: string | null
  guest_email?: string | null
  notes?: string | null
}): Promise<Invoice | null> {
  try {
    const sb = createSupabaseAdminClient()
    const invoice_no = await nextInvoiceNo()
    const { data, error } = await sb
      .from("booking_invoice")
      .insert({
        invoice_no,
        bookingid: input.bookingid ?? null,
        booking_ref: input.booking_ref ?? null,
        guest_name: input.guest_name ?? null,
        guest_email: input.guest_email ?? null,
        notes: input.notes ?? null,
        status: "draft",
      })
      .select()
      .single()
    if (error) { console.warn("[booking-extras] createInvoice:", error.message); return null }
    return { ...(data as Invoice), items: [] }
  } catch (err) { console.warn("[booking-extras] createInvoice error:", err); return null }
}

export async function getInvoicesForBooking(bookingid: number): Promise<Invoice[]> {
  try {
    const sb = createSupabaseAdminClient()
    const { data, error } = await sb
      .from("booking_invoice")
      .select("*")
      .eq("bookingid", bookingid)
      .order("created_at", { ascending: false })
    if (error) { console.warn("[booking-extras] getInvoicesForBooking:", error.message); return [] }
    return (data as Invoice[]) ?? []
  } catch (err) { console.warn("[booking-extras] getInvoicesForBooking error:", err); return [] }
}

export async function getInvoiceWithItems(invoiceId: number): Promise<Invoice | null> {
  try {
    const sb = createSupabaseAdminClient()
    const [{ data: inv }, { data: items }] = await Promise.all([
      sb.from("booking_invoice").select("*").eq("id", invoiceId).single(),
      sb.from("booking_line_item").select("*").eq("invoice_id", invoiceId).order("id", { ascending: true }),
    ])
    if (!inv) return null
    return { ...(inv as Invoice), items: (items as InvoiceLineItem[]) ?? [] }
  } catch (err) { console.warn("[booking-extras] getInvoiceWithItems error:", err); return null }
}

export async function addLineItem(
  invoiceId: number,
  item: { description: string; quantity: number; unit_price: number },
): Promise<boolean> {
  try {
    const sb = createSupabaseAdminClient()
    const amount = Math.round(item.quantity * item.unit_price * 100) / 100
    const { error } = await sb.from("booking_line_item").insert({
      invoice_id: invoiceId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      amount,
    })
    if (error) { console.warn("[booking-extras] addLineItem:", error.message); return false }
    await recalcInvoiceTotals(invoiceId)
    return true
  } catch (err) { console.warn("[booking-extras] addLineItem error:", err); return false }
}

export async function deleteLineItem(itemId: number, invoiceId: number): Promise<boolean> {
  try {
    const sb = createSupabaseAdminClient()
    const { error } = await sb.from("booking_line_item").delete().eq("id", itemId)
    if (error) { console.warn("[booking-extras] deleteLineItem:", error.message); return false }
    await recalcInvoiceTotals(invoiceId)
    return true
  } catch (err) { console.warn("[booking-extras] deleteLineItem error:", err); return false }
}

export async function recalcInvoiceTotals(invoiceId: number): Promise<void> {
  try {
    const sb = createSupabaseAdminClient()
    const { data } = await sb.from("booking_line_item").select("amount").eq("invoice_id", invoiceId)
    const subtotal = (data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0)
    await sb
      .from("booking_invoice")
      .update({ subtotal, total: subtotal, updated_at: new Date().toISOString() })
      .eq("id", invoiceId)
  } catch (err) { console.warn("[booking-extras] recalcInvoiceTotals error:", err) }
}

export async function setInvoiceStatus(
  invoiceId: number,
  status: Invoice["status"],
): Promise<boolean> {
  try {
    const sb = createSupabaseAdminClient()
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    if (status === "sent") patch.issued_at = new Date().toISOString()
    const { error } = await sb.from("booking_invoice").update(patch).eq("id", invoiceId)
    if (error) { console.warn("[booking-extras] setInvoiceStatus:", error.message); return false }
    return true
  } catch (err) { console.warn("[booking-extras] setInvoiceStatus error:", err); return false }
}

function fmtZar(n: number) {
  return `R ${Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Build a branded invoice email (HTML), matching the site's email theme. */
export function buildInvoiceEmail(invoice: Invoice): string {
  const c = EMAIL_COLORS
  const rows = (invoice.items ?? [])
    .map(
      (it, i) => `<tr>
        <td style="padding:10px 0;color:${c.bodyText};font-size:13px;border-bottom:${i === (invoice.items?.length ?? 0) - 1 ? "none" : `1px solid ${c.border}`};">${it.description}</td>
        <td style="padding:10px 0;text-align:center;color:${c.muted};font-size:13px;border-bottom:${i === (invoice.items?.length ?? 0) - 1 ? "none" : `1px solid ${c.border}`};">${it.quantity}</td>
        <td style="padding:10px 0;text-align:right;color:${c.muted};font-size:13px;border-bottom:${i === (invoice.items?.length ?? 0) - 1 ? "none" : `1px solid ${c.border}`};">${fmtZar(it.unit_price)}</td>
        <td style="padding:10px 0;text-align:right;color:${c.bodyText};font-size:13px;font-weight:600;border-bottom:${i === (invoice.items?.length ?? 0) - 1 ? "none" : `1px solid ${c.border}`};">${fmtZar(it.amount)}</td>
      </tr>`,
    )
    .join("")

  return emailShell({
    title: `Invoice ${invoice.invoice_no} – Boga Legaba`,
    preheader: `Your invoice ${invoice.invoice_no}, total ${fmtZar(invoice.total)}`,
    eyebrow: `Invoice ${invoice.invoice_no}`,
    bodyHtml: `
      <tr><td style="padding:32px 40px 8px;">
        <p style="margin:0;color:${c.bodyText};font-size:14px;">Hi ${invoice.guest_name || "there"},</p>
        <p style="margin:6px 0 0;color:${c.muted};font-size:13px;line-height:1.7;">Please find your invoice from Boga Legaba below.</p>
      </td></tr>
      <tr><td style="padding:20px 40px 8px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid ${c.border};">
          <tr><td style="background:${c.sand};padding:14px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="color:${c.muted};font-size:9px;text-transform:uppercase;letter-spacing:1.5px;">Item</td>
              <td style="color:${c.muted};font-size:9px;text-transform:uppercase;letter-spacing:1.5px;text-align:center;">Qty</td>
              <td style="color:${c.muted};font-size:9px;text-transform:uppercase;letter-spacing:1.5px;text-align:right;">Unit</td>
              <td style="color:${c.muted};font-size:9px;text-transform:uppercase;letter-spacing:1.5px;text-align:right;">Amount</td>
            </tr></table>
          </td></tr>
          <tr><td style="background:#ffffff;padding:6px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${rows || `<tr><td style="padding:12px 0;color:${c.muted};font-size:13px;">No line items</td></tr>`}
            </table>
          </td></tr>
          <tr><td style="background:${c.black};padding:16px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="color:${c.muted};font-size:11px;text-transform:uppercase;letter-spacing:1.5px;">Total Due</td>
              <td style="color:${c.gold};font-size:20px;font-weight:700;text-align:right;font-family:'Playfair Display',Georgia,serif;">${fmtZar(invoice.total)}</td>
            </tr></table>
          </td></tr>
        </table>
      </td></tr>
      ${invoice.notes ? `<tr><td style="padding:0 40px 24px;"><p style="margin:0;color:${c.muted};font-size:12px;line-height:1.7;">${invoice.notes}</p></td></tr>` : ""}
    `,
  })
}

/** Release an invoice: email it to the guest and mark it "sent". */
export async function sendInvoice(invoiceId: number): Promise<{ ok: boolean; error?: string }> {
  const invoice = await getInvoiceWithItems(invoiceId)
  if (!invoice) return { ok: false, error: "Invoice not found" }
  if (!invoice.guest_email) return { ok: false, error: "No guest email on this invoice" }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey || resendKey === "re_REPLACE_ME") {
    return { ok: false, error: "Email is not configured (RESEND_API_KEY)" }
  }
  try {
    const resend = new Resend(resendKey)
    const from = process.env.RESEND_FROM_EMAIL ?? "Boga Legaba <onboarding@resend.dev>"
    await resend.emails.send({
      from,
      to: invoice.guest_email,
      subject: `Invoice ${invoice.invoice_no} – Boga Legaba`,
      html: buildInvoiceEmail(invoice),
    })
    await setInvoiceStatus(invoiceId, "sent")
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Send failed" }
  }
}
