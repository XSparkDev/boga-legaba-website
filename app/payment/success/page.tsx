"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

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
    { label: "Amount Paid",      value: amountFormatted, gold: true },
  ].filter((r) => r.value)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5" style={{ background: "#F2EDE4" }}>
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 40px rgba(0,0,0,0.10)" }}>

          {/* Dark lodge header */}
          <div className="px-8 py-7 text-center" style={{ background: "#0A0A0A" }}>
            <p
              className="tracking-[0.25em] font-normal"
              style={{ fontFamily: "var(--font-playfair), Georgia, serif", color: "#C9A84C", fontSize: "20px" }}
            >
              BOGA LEGABA
            </p>
            <p className="tracking-[0.18em] mt-1" style={{ color: "#8C7B6B", fontSize: "10px" }}>
              PRIVATE GAME LODGE
            </p>
            {/* Gold divider */}
            <div className="mx-auto mt-4" style={{ height: "1px", width: "48px", background: "#C9A84C", opacity: 0.6 }} />
          </div>

          {/* Success banner */}
          <div className="px-8 pt-8 pb-4 text-center">
            {/* Gold check circle */}
            <div
              className="mx-auto mb-4 flex items-center justify-center rounded-full"
              style={{ width: 56, height: 56, background: "#F2EDE4", border: "2px solid #C9A84C" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#C9A84C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h1
              className="font-normal mb-2"
              style={{ fontFamily: "var(--font-playfair), Georgia, serif", color: "#0A0A0A", fontSize: "26px", letterSpacing: "-0.01em" }}
            >
              Payment Confirmed
            </h1>
            <p style={{ color: "#8C7B6B", fontSize: "13px", lineHeight: 1.6 }}>
              Thank you, <span style={{ color: "#3D3532", fontWeight: 500 }}>{guestName}</span>.<br />
              Your stay at Boga Legaba is fully confirmed.
            </p>
          </div>

          {/* Booking details */}
          {details.length > 0 && (
            <div className="px-6 py-4">
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #E8E0D4" }}>
                {details.map((row, i) => (
                  <div
                    key={row.label}
                    className="px-5 py-3.5"
                    style={{
                      background: i % 2 === 0 ? "#FAFAF8" : "#F2EDE4",
                      borderBottom: i < details.length - 1 ? "1px solid #E8E0D4" : "none",
                    }}
                  >
                    <p style={{ color: "#8C7B6B", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>
                      {row.label}
                    </p>
                    <p
                      style={{
                        margin: "3px 0 0",
                        fontSize: row.gold ? "20px" : "14px",
                        fontWeight: row.gold ? 600 : 500,
                        color: row.gold ? "#B8973B" : "#3D3532",
                        fontFamily: row.gold ? "var(--font-playfair), Georgia, serif" : "inherit",
                      }}
                    >
                      {row.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          <div className="mx-6 mb-5 px-4 py-3 rounded-xl" style={{ background: "#F2EDE4", border: "1px solid #E8E0D4" }}>
            <p style={{ margin: 0, fontSize: "12px", color: "#8C7B6B", lineHeight: 1.6, textAlign: "center" }}>
              A confirmation email has been sent to you with all the details.<br />
              We look forward to welcoming you to the bush.
            </p>
          </div>

          {/* CTA */}
          <div className="px-6 pb-7">
            <a
              href="/"
              className="flex w-full items-center justify-center rounded-xl py-3.5 text-sm font-semibold transition-all"
              style={{ background: "#C9A84C", color: "#0A0A0A", letterSpacing: "0.04em" }}
            >
              Back to Home
            </a>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center mt-5" style={{ color: "#8C7B6B", fontSize: "11px", letterSpacing: "0.05em" }}>
          PAYMENT PROCESSED SECURELY VIA PAYSTACK
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
