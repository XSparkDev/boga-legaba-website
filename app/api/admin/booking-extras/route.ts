import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  upsertDepartmentFlag,
  createInvoice,
  getInvoicesForBooking,
  getInvoiceWithItems,
  addLineItem,
  deleteLineItem,
  setInvoiceStatus,
} from "@/lib/booking-extras"

export const dynamic = "force-dynamic"

async function isAuthenticated() {
  const store = await cookies()
  return store.get("bl_admin_session")?.value === process.env.ADMIN_SECRET
}

/**
 * Admin actions for booking extras (department flag + invoices + line items).
 * Single POST endpoint dispatched by `action` to keep it simple. Auth-guarded.
 */
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 })
  }

  const action = String(body.action ?? "")

  switch (action) {
    case "setDepartment": {
      const ok = await upsertDepartmentFlag({
        bookingid: body.bookingid != null ? Number(body.bookingid) : null,
        booking_ref: (body.booking_ref as string) ?? null,
        is_department: Boolean(body.is_department),
        department_name: (body.department_name as string) ?? null,
        po_number: (body.po_number as string) ?? null,
        contact_person: (body.contact_person as string) ?? null,
      })
      return NextResponse.json({ ok })
    }

    case "createInvoice": {
      const invoice = await createInvoice({
        bookingid: body.bookingid != null ? Number(body.bookingid) : null,
        booking_ref: (body.booking_ref as string) ?? null,
        guest_name: (body.guest_name as string) ?? null,
        guest_email: (body.guest_email as string) ?? null,
        notes: (body.notes as string) ?? null,
      })
      return NextResponse.json({ ok: Boolean(invoice), invoice })
    }

    case "listInvoices": {
      const invoices = await getInvoicesForBooking(Number(body.bookingid))
      return NextResponse.json({ ok: true, invoices })
    }

    case "getInvoice": {
      const invoice = await getInvoiceWithItems(Number(body.invoiceId))
      return NextResponse.json({ ok: Boolean(invoice), invoice })
    }

    case "addLineItem": {
      const ok = await addLineItem(Number(body.invoiceId), {
        description: String(body.description ?? "").trim(),
        quantity: Number(body.quantity ?? 1),
        unit_price: Number(body.unit_price ?? 0),
      })
      const invoice = ok ? await getInvoiceWithItems(Number(body.invoiceId)) : null
      return NextResponse.json({ ok, invoice })
    }

    case "deleteLineItem": {
      const ok = await deleteLineItem(Number(body.itemId), Number(body.invoiceId))
      const invoice = ok ? await getInvoiceWithItems(Number(body.invoiceId)) : null
      return NextResponse.json({ ok, invoice })
    }

    case "setInvoiceStatus": {
      const status = String(body.status) as "draft" | "sent" | "paid" | "void"
      if (!["draft", "sent", "paid", "void"].includes(status)) {
        return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 })
      }
      const ok = await setInvoiceStatus(Number(body.invoiceId), status)
      return NextResponse.json({ ok })
    }

    default:
      return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 })
  }
}
