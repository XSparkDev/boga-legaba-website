"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function FailedContent() {
  const params     = useSearchParams()
  const bookingRef = params.get("bookingRef") ?? ""
  // "paid-not-booked" = payment DID succeed but the booking could not be created.
  const paidNotBooked = params.get("reason") === "paid-not-booked"

  const heading = paidNotBooked ? "We're finalising your booking" : "Payment Unsuccessful"
  const message = paidNotBooked
    ? "Your payment went through, but we hit a snag confirming the room automatically. Our team has already been alerted and will contact you shortly to confirm your booking or arrange a refund. You do not need to do anything."
    : "Your payment could not be processed, so no booking was made and you have not been charged. Please try again below, or contact us on WhatsApp."

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5" style={{ background: "#F2EDE4" }}>
      <div className="w-full max-w-md">

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
            <div className="mx-auto mt-4" style={{ height: "1px", width: "48px", background: "#C9A84C", opacity: 0.6 }} />
          </div>

          {/* Failed content */}
          <div className="px-8 pt-8 pb-4 text-center">
            <div
              className="mx-auto mb-4 flex items-center justify-center rounded-full"
              style={{ width: 56, height: 56, background: "#FEF2F2", border: "2px solid #FCA5A5" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4M12 17h.01" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#EF4444" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>

            <h1
              className="font-normal mb-2"
              style={{ fontFamily: "var(--font-playfair), Georgia, serif", color: "#0A0A0A", fontSize: "26px" }}
            >
              {heading}
            </h1>
            <p style={{ color: "#8C7B6B", fontSize: "13px", lineHeight: 1.7 }}>
              {message}
            </p>
          </div>

          {bookingRef && (
            <div className="px-6 py-2">
              <div className="px-5 py-3.5 rounded-xl" style={{ background: "#F2EDE4", border: "1px solid #E8E0D4" }}>
                <p style={{ margin: 0, color: "#8C7B6B", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                  Booking Reference
                </p>
                <p style={{ margin: "3px 0 0", color: "#3D3532", fontSize: "14px", fontWeight: 500 }}>
                  {bookingRef}
                </p>
              </div>
            </div>
          )}

          <div className="mx-6 mt-4 mb-5 px-4 py-3 rounded-xl" style={{ background: "#F2EDE4", border: "1px solid #E8E0D4" }}>
            <p style={{ margin: 0, fontSize: "12px", color: "#8C7B6B", lineHeight: 1.6, textAlign: "center" }}>
              {paidNotBooked
                ? "Please keep your payment reference handy. If you have any questions, contact us on WhatsApp."
                : "Please try again below, or contact us via WhatsApp if the problem persists."}
            </p>
          </div>

          {/* Actions */}
          <div className="px-6 pb-7 space-y-3">
            {!paidNotBooked && (
              <button
                onClick={() => window.history.back()}
                className="flex w-full items-center justify-center rounded-xl py-3.5 text-sm font-semibold transition-all hover:brightness-110"
                style={{ background: "#C9A84C", color: "#0A0A0A", letterSpacing: "0.04em" }}
              >
                Try Payment Again
              </button>
            )}
            <a
              href="/"
              className="flex w-full items-center justify-center rounded-xl py-3.5 text-sm transition-all"
              style={{ background: "#F2EDE4", color: "#8C7B6B", border: "1px solid #E8E0D4", letterSpacing: "0.02em" }}
            >
              Back to Home
            </a>
          </div>
        </div>

        <p className="text-center mt-5" style={{ color: "#8C7B6B", fontSize: "11px", letterSpacing: "0.05em" }}>
          SECURE PAYMENT BY PAYSTACK
        </p>
      </div>
    </div>
  )
}

export default function PaymentFailedPage() {
  return (
    <Suspense>
      <FailedContent />
    </Suspense>
  )
}
