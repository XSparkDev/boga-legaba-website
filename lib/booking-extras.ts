/**
 * Server-side data access for app-owned booking extras: department flag,
 * invoices, and invoice line items. All stored in the NEW tables from
 * migration 009 — the `booking` table is never written to, only read/joined.
 *
 * Every function fails soft (returns null/empty and logs) if the tables don't
 * exist yet, so the rest of the app is unaffected until the migration is applied.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

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
  try {
    const sb = createSupabaseAdminClient()
    const { error } = await sb
      .from("booking_department")
      .upsert({ ...input, updated_at: new Date().toISOString() }, { onConflict: "bookingid" })
    if (error) { console.warn("[booking-extras] upsertDepartmentFlag:", error.message); return false }
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
