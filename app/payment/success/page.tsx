"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { toast } from "sonner"
import { SiteLogo } from "@/components/site-logo"
import { cn } from "@/lib/utils"

function SuccessContent() {
  const params       = useSearchParams()
  const bookingRef   = params.get("bookingRef") ?? ""
  const guestName    = params.get("guestName") ?? "Guest"
  const checkin      = params.get("checkin") ?? ""
  const checkout     = params.get("checkout") ?? ""
  const roomTypeName = params.get("roomTypeName") ?? ""
  const roomName     = params.get("roomName") ?? ""
  const amount       = params.get("amount") ?? ""

  useEffect(() => {
    toast.success("Payment confirmed", {
      description: "Your stay at Boga Legaba is fully booked.",
    })
  }, [])

  const fmtDate = (iso: string) => {
    if (!iso) return ""
    const d = new Date(iso)
    return isNaN(d.getTime())
      ? iso
      : d.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })
  }

  const amountFormatted = amount
    ? `R ${parseFloat(amount).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`
    : ""

  const details = [
    { label: "Booking Reference", value: bookingRef },
    { label: "Room",              value: roomName || roomTypeName },
    { label: "Check-in",         value: fmtDate(checkin) },
    { label: "Check-out",        value: fmtDate(checkout) },
    { label: "Amount Paid",      value: amountFormatted, gold: true },
  ].filter((r) => r.value)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sand p-5">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">

          {/* Dark header, matches site nav */}
          <div className="bg-black px-8 py-7 text-center">
            <SiteLogo size="hero" className="mx-auto" />
            <div className="mx-auto mt-4 h-px w-12 bg-gold opacity-60" />
          </div>

          {/* Success banner */}
          <div className="px-8 pt-8 pb-4 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full border-2 border-gold bg-sand">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#996948" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h1 className="mb-2 font-display text-2xl font-semibold tracking-tight text-foreground">
              Payment Confirmed
            </h1>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Thank you, <span className="font-medium text-foreground">{guestName}</span>.<br />
              Your stay at Boga Legaba is fully confirmed.
            </p>
          </div>

          {/* Booking details */}
          {details.length > 0 && (
            <div className="px-6 py-4">
              <div className="overflow-hidden rounded-xl border border-border">
                {details.map((row, i) => (
                  <div
                    key={row.label}
                    className={cn(
                      "px-5 py-3.5",
                      i % 2 === 0 ? "bg-sand" : "bg-card",
                      i < details.length - 1 && "border-b border-border",
                    )}
                  >
                    <p className="m-0 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {row.label}
                    </p>
                    <p
                      className={cn(
                        "mt-[3px]",
                        row.gold
                          ? "font-display text-xl font-semibold text-gold"
                          : "text-sm font-medium text-foreground",
                      )}
                    >
                      {row.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          <div className="mx-6 mb-5 rounded-xl border border-border bg-sand px-4 py-3">
            <p className="m-0 text-center text-xs leading-relaxed text-muted-foreground">
              A confirmation email has been sent to you with all the details.<br />
              We look forward to welcoming you.
            </p>
            <p className="m-0 mt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
              If you don&apos;t receive it shortly, please contact us at Boga Legaba.
            </p>
          </div>

          {/* CTA */}
          <div className="px-6 pb-7">
            <a
              href="/"
              className="flex w-full items-center justify-center rounded-xl bg-gold py-3.5 text-sm font-semibold tracking-wide text-white transition-all hover:brightness-110"
            >
              Back to Home
            </a>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-5 text-center text-[11px] tracking-wide text-muted-foreground">
          SECURE PAYMENT BY PAYSTACK
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
