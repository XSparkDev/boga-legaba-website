"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { CheckCircle2, Heart } from "lucide-react"

function SuccessContent() {
  const params       = useSearchParams()
  const bookingRef   = params.get("bookingRef") ?? ""
  const guestName    = params.get("guestName") ?? "Guest"
  const checkin      = params.get("checkin") ?? ""
  const checkout     = params.get("checkout") ?? ""
  const roomTypeName = params.get("roomTypeName") ?? ""
  const amount       = params.get("amount") ?? ""

  const amountFormatted = amount
    ? `R ${parseFloat(amount).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`
    : ""

  const details = [
    { label: "Booking Reference", value: bookingRef },
    { label: "Room",              value: roomTypeName },
    { label: "Check-in",         value: checkin },
    { label: "Check-out",        value: checkout },
    { label: "Amount Paid",      value: amountFormatted },
  ].filter((r) => r.value)

  return (
    <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">

          {/* Dark lodge header */}
          <div className="bg-[#1a3a2a] px-6 py-6 text-center">
            <p
              className="text-[#d4a843] text-xl tracking-widest font-normal"
              style={{ fontFamily: "Georgia, serif" }}
            >
              BOGA LEGABA
            </p>
            <p className="text-[#a8c5b4] text-xs tracking-widest mt-1">PRIVATE GAME LODGE</p>
          </div>

          {/* Green success banner */}
          <div className="bg-emerald-500 px-6 py-5 text-center">
            <CheckCircle2 className="mx-auto mb-2 size-10 text-white" />
            <h1 className="text-white font-bold text-xl">Thank you for your payment!</h1>
            <p className="text-emerald-100 text-sm mt-1">Your stay is fully confirmed.</p>
          </div>

          {/* Personal message */}
          <div className="px-6 pt-6 pb-2">
            <p className="text-gray-700 text-sm leading-relaxed text-center">
              We&apos;re thrilled to be hosting you, <strong>{guestName}</strong>. 🌿
              <br />A confirmation email has been sent to you with all the details.
            </p>
          </div>

          {/* Booking details */}
          {details.length > 0 && (
            <div className="px-6 py-4">
              <div className="bg-[#f9f7f2] rounded-xl border border-gray-100 divide-y divide-gray-100">
                {details.map((row) => (
                  <div key={row.label} className="px-4 py-3">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">
                      {row.label}
                    </p>
                    <p
                      className={`text-sm font-semibold ${
                        row.label === "Amount Paid"
                          ? "text-emerald-600 text-base"
                          : "text-gray-900"
                      }`}
                    >
                      {row.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Heart note */}
          <div className="mx-6 mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 flex items-center gap-2">
            <Heart className="size-4 shrink-0 text-emerald-500" />
            <p className="text-xs text-emerald-800">
              We look forward to welcoming you to the bush. See you soon!
            </p>
          </div>

          {/* Back home */}
          <div className="px-6 pb-6">
            <a
              href="/"
              className="flex w-full items-center justify-center rounded-xl bg-[#b8973a] px-6 py-3 text-sm font-semibold text-white hover:brightness-110 transition-all"
            >
              Back to home
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Payment processed securely via Paystack
        </p>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}
