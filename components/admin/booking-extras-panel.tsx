"use client"

import { useEffect, useState } from "react"
import { X, Plus, Trash2, Send, Loader2, FileText, Building2 } from "lucide-react"

type Invoice = {
  id: number
  invoice_no: string
  status: "draft" | "sent" | "paid" | "void"
  subtotal: number
  total: number
  guest_email: string | null
  notes: string | null
  items?: Array<{ id: number; description: string; quantity: number; unit_price: number; amount: number }>
}

type Booking = {
  bookingid: number
  booking_ref?: string | null
  guest_name?: string | null
  guest_email?: string | null
  department?: {
    is_department: boolean
    department_name: string | null
    po_number: string | null
    contact_person: string | null
  } | null
}

const API = "/api/admin/booking-extras"
async function post<T = Record<string, unknown>>(action: string, payload: Record<string, unknown>): Promise<T> {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  })
  return res.json()
}
const zar = (n: number) => `R ${Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`

export function BookingExtrasPanel({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  // department state
  const [isDept, setIsDept] = useState(booking.department?.is_department ?? false)
  const [deptName, setDeptName] = useState(booking.department?.department_name ?? "")
  const [poNo, setPoNo] = useState(booking.department?.po_number ?? "")
  const [contact, setContact] = useState(booking.department?.contact_person ?? "")
  const [deptSaving, setDeptSaving] = useState(false)

  // invoice state
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selected, setSelected] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")

  // new line item
  const [desc, setDesc] = useState("")
  const [qty, setQty] = useState("1")
  const [price, setPrice] = useState("")

  useEffect(() => {
    ;(async () => {
      const r = await post<{ invoices: Invoice[] }>("listInvoices", { bookingid: booking.bookingid })
      setInvoices(r.invoices ?? [])
      setLoading(false)
    })()
  }, [booking.bookingid])

  async function saveDept() {
    setDeptSaving(true); setMsg("")
    const r = await post("setDepartment", {
      bookingid: booking.bookingid, booking_ref: booking.booking_ref,
      is_department: isDept, department_name: deptName, po_number: poNo, contact_person: contact,
    })
    setDeptSaving(false)
    setMsg((r as { ok: boolean }).ok ? "Department details saved." : "Could not save (is the migration applied?).")
  }

  async function newInvoice() {
    setBusy(true)
    const r = await post<{ ok: boolean; invoice: Invoice }>("createInvoice", {
      bookingid: booking.bookingid, booking_ref: booking.booking_ref,
      guest_name: booking.guest_name, guest_email: booking.guest_email,
    })
    setBusy(false)
    if (r.ok && r.invoice) { setInvoices((v) => [{ ...r.invoice, items: [] }, ...v]); setSelected({ ...r.invoice, items: [] }) }
    else setMsg("Could not create invoice (is the migration applied?).")
  }

  async function openInvoice(id: number) {
    setBusy(true)
    const r = await post<{ invoice: Invoice }>("getInvoice", { invoiceId: id })
    setBusy(false); setSelected(r.invoice ?? null)
  }

  async function addItem() {
    if (!selected || !desc.trim()) return
    setBusy(true)
    const r = await post<{ ok: boolean; invoice: Invoice }>("addLineItem", {
      invoiceId: selected.id, description: desc.trim(), quantity: Number(qty) || 1, unit_price: Number(price) || 0,
    })
    setBusy(false)
    if (r.ok && r.invoice) { setSelected(r.invoice); setDesc(""); setQty("1"); setPrice(""); refreshList(r.invoice) }
  }
  async function removeItem(itemId: number) {
    if (!selected) return
    setBusy(true)
    const r = await post<{ ok: boolean; invoice: Invoice }>("deleteLineItem", { itemId, invoiceId: selected.id })
    setBusy(false); if (r.ok && r.invoice) { setSelected(r.invoice); refreshList(r.invoice) }
  }
  async function status(s: Invoice["status"]) {
    if (!selected) return
    setBusy(true); await post("setInvoiceStatus", { invoiceId: selected.id, status: s }); setBusy(false)
    const upd = { ...selected, status: s }; setSelected(upd); refreshList(upd)
  }
  async function release() {
    if (!selected) return
    setBusy(true); setMsg("")
    const r = await post<{ ok: boolean; error?: string }>("sendInvoice", { invoiceId: selected.id })
    setBusy(false)
    if (r.ok) { const upd = { ...selected, status: "sent" as const }; setSelected(upd); refreshList(upd); setMsg("Invoice sent to guest.") }
    else setMsg(r.error ?? "Could not send invoice.")
  }
  function refreshList(inv: Invoice) {
    setInvoices((list) => list.map((i) => (i.id === inv.id ? { ...i, ...inv } : i)))
  }

  const inputCls = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#996948] focus:outline-none"

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="font-serif text-base font-bold text-gray-900">Invoice &amp; department</p>
            <p className="font-mono text-[11px] text-gray-400">
              {booking.guest_name ?? "Guest"} · booking #{booking.bookingid}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100"><X className="size-4" /></button>
        </div>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto p-6">
          {msg && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{msg}</p>}

          {/* Department */}
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-gray-500">
              <Building2 className="size-3.5 text-[#996948]" /> Department / corporate
            </h3>
            <label className="mb-2 flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={isDept} onChange={(e) => setIsDept(e.target.checked)} className="accent-[#996948]" />
              This is a department booking (no upfront payment)
            </label>
            {isDept && (
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Department name" value={deptName} onChange={(e) => setDeptName(e.target.value)} className={inputCls} />
                <input placeholder="PO / order number" value={poNo} onChange={(e) => setPoNo(e.target.value)} className={inputCls} />
                <input placeholder="Contact person" value={contact} onChange={(e) => setContact(e.target.value)} className={`${inputCls} col-span-2`} />
              </div>
            )}
            <button onClick={saveDept} disabled={deptSaving} className="mt-2 rounded-lg bg-[#996948] px-4 py-1.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50">
              {deptSaving ? "Saving…" : "Save department details"}
            </button>
          </section>

          <div className="border-t border-gray-100" />

          {/* Invoices */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-gray-500">
                <FileText className="size-3.5 text-[#996948]" /> Invoices
              </h3>
              <button onClick={newInvoice} disabled={busy} className="flex items-center gap-1 rounded-lg border border-[#996948]/40 bg-[#996948]/10 px-2.5 py-1 text-[11px] font-medium text-[#996948] hover:bg-[#996948]/20">
                <Plus className="size-3" /> New invoice
              </button>
            </div>

            {loading ? (
              <Loader2 className="size-4 animate-spin text-gray-400" />
            ) : invoices.length === 0 ? (
              <p className="text-xs text-gray-400">No invoices yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {invoices.map((inv) => (
                  <button key={inv.id} onClick={() => openInvoice(inv.id)}
                    className={`rounded-lg border px-3 py-1.5 text-left text-xs ${selected?.id === inv.id ? "border-[#996948] bg-amber-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <span className="font-mono font-semibold text-gray-800">{inv.invoice_no}</span>
                    <span className="ml-2 text-gray-400">{inv.status}</span>
                    <span className="ml-2 text-[#996948]">{zar(inv.total)}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Selected invoice editor */}
            {selected && (
              <div className="mt-4 rounded-xl border border-gray-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-mono text-sm font-semibold text-gray-800">{selected.invoice_no}</p>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[10px] uppercase text-gray-500">{selected.status}</span>
                </div>

                <table className="w-full text-xs">
                  <tbody>
                    {(selected.items ?? []).map((it) => (
                      <tr key={it.id} className="border-b border-gray-50">
                        <td className="py-1.5 text-gray-700">{it.description}</td>
                        <td className="py-1.5 text-center text-gray-400">{it.quantity}</td>
                        <td className="py-1.5 text-right text-gray-500">{zar(it.unit_price)}</td>
                        <td className="py-1.5 text-right text-gray-800">{zar(it.amount)}</td>
                        <td className="py-1.5 pl-2 text-right">
                          <button onClick={() => removeItem(it.id)} className="text-red-400 hover:text-red-600"><Trash2 className="size-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Add line item */}
                <div className="mt-3 flex items-end gap-2">
                  <input placeholder="Description (e.g. Breakfast x2)" value={desc} onChange={(e) => setDesc(e.target.value)} className={`${inputCls} flex-1`} />
                  <input placeholder="Qty" value={qty} onChange={(e) => setQty(e.target.value)} className={`${inputCls} w-16`} />
                  <input placeholder="Unit R" value={price} onChange={(e) => setPrice(e.target.value)} className={`${inputCls} w-24`} />
                  <button onClick={addItem} disabled={busy || !desc.trim()} className="rounded-lg bg-[#996948] px-3 py-2 text-sm text-white hover:brightness-110 disabled:opacity-50"><Plus className="size-4" /></button>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                  <p className="text-sm font-semibold text-gray-800">Total: <span className="text-[#996948]">{zar(selected.total)}</span></p>
                  <div className="flex gap-2">
                    <button onClick={() => status("paid")} disabled={busy} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100">Mark paid</button>
                    <button onClick={release} disabled={busy} className="flex items-center gap-1 rounded-lg bg-[#000000] px-3 py-1.5 text-xs font-semibold text-[#996948] hover:brightness-125">
                      <Send className="size-3.5" /> Send to guest
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
