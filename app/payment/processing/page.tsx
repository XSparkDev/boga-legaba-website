"use client"

import { useEffect, useRef, useState } from "react"
import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function ProcessingContent() {
  const router = useRouter()
  const params = useSearchParams()
  const reference = params.get("reference") ?? params.get("trxref") ?? ""
  const started = useRef(false)
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    // Guard against double-invocation (React strict mode / re-renders) so the
    // booking is only attempted once for this payment reference.
    if (started.current) return
    started.current = true

    if (!reference) {
      router.replace("/payment/failed")
      return
    }

    // After ~12s, reassure the guest that the wait is normal.
    const slowTimer = setTimeout(() => setSlow(true), 12_000)

    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []

    const toSuccess = (d: { bookingRef?: string; guestName?: string; checkin?: string; checkout?: string; roomTypeName?: string; amount?: number | string }) => {
      const q = new URLSearchParams({
        bookingRef: d.bookingRef ?? "",
        guestName: d.guestName ?? "",
        checkin: d.checkin ?? "",
        checkout: d.checkout ?? "",
        roomTypeName: d.roomTypeName ?? "",
        amount: String(d.amount ?? ""),
      })
      router.replace(`/payment/success?${q.toString()}`)
    }
    const toFailed = (bookingRef = "", reason = "paid-not-booked") =>
      router.replace(`/payment/failed?${new URLSearchParams({ bookingRef, reason }).toString()}`)

    // Poll the async booking status until it resolves. The booking runs in the
    // worker's background — nothing here waits on a long request, so there's no
    // timeout to hit. We give it a generous ceiling, then hand off gracefully.
    const POLL_MS = 3_000
    const MAX_POLLS = 90 // ~4.5 min
    async function poll(attempt: number): Promise<void> {
      if (cancelled) return
      try {
        const res = await fetch(`/api/payment/status?reference=${encodeURIComponent(reference)}`, { cache: "no-store" })
        const d = (await res.json().catch(() => ({}))) as {
          status?: string
          bookingRef?: string
          guestName?: string
          checkin?: string
          checkout?: string
          roomTypeName?: string
          amount?: number | string
        }
        if (cancelled) return
        if (d.status === "booked") return toSuccess(d)
        if (d.status === "failed") return toFailed(d.bookingRef ?? "", "paid-not-booked")
      } catch {
        /* transient — keep polling */
      }
      if (attempt >= MAX_POLLS) {
        // Still not done after the ceiling — the booking may yet complete in the
        // background; send the guest to the "we're finalising, contact us if no
        // email" screen rather than spinning forever.
        return toFailed("", "paid-not-booked")
      }
      timers.push(setTimeout(() => poll(attempt + 1), POLL_MS))
    }

    ;(async () => {
      try {
        const res = await fetch("/api/payment/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean
          mode?: string
          status?: string
          booked?: boolean
          bookingRef?: string
          guestName?: string
          checkin?: string
          checkout?: string
          roomTypeName?: string
          amount?: number
        }

        if (!data.ok) {
          // Payment could not be verified.
          router.replace("/payment/failed")
          return
        }

        if (data.mode === "async") {
          // Booking kicked off in the background → poll for the outcome.
          poll(0)
          return
        }

        // Fallback (sync) mode — booking already ran inline.
        if (data.booked) toSuccess(data)
        else toFailed(data.bookingRef ?? "", "paid-not-booked")
      } catch {
        // Network/unknown error — treat as paid-not-booked so the guest is told
        // to contact us rather than seeing a blank error (staff are alerted).
        toFailed("", "paid-not-booked")
      }
    })()

    return () => {
      cancelled = true
      clearTimeout(slowTimer)
      timers.forEach(clearTimeout)
    }
  }, [reference, router])

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
              GUEST HOUSE &amp; CONFERENCE CENTRE
            </p>
            <div className="mx-auto mt-4" style={{ height: "1px", width: "48px", background: "#C9A84C", opacity: 0.6 }} />
          </div>

          {/* Loading content */}
          <div className="px-8 pt-10 pb-10 text-center">
            {/* Spinner */}
            <div
              className="mx-auto mb-6"
              style={{
                width: 48,
                height: 48,
                border: "3px solid #F2EDE4",
                borderTopColor: "#C9A84C",
                borderRadius: "50%",
                animation: "blspin 0.9s linear infinite",
              }}
            />
            <h1
              className="font-normal mb-2"
              style={{ fontFamily: "var(--font-playfair), Georgia, serif", color: "#0A0A0A", fontSize: "24px" }}
            >
              Payment received
            </h1>
            <p style={{ color: "#3D3532", fontSize: "14px", fontWeight: 600, lineHeight: 1.6, margin: "0 0 6px" }}>
              Securing your booking…
            </p>
            <p style={{ color: "#8C7B6B", fontSize: "13px", lineHeight: 1.7 }}>
              Please don&apos;t close or refresh this page.
              {slow ? " This can take a minute or two — hang tight." : ""}
            </p>
          </div>

          <div className="mx-6 mb-6 px-4 py-3 rounded-xl" style={{ background: "#F2EDE4", border: "1px solid #E8E0D4" }}>
            <p style={{ margin: 0, fontSize: "11px", color: "#8C7B6B", lineHeight: 1.6, textAlign: "center" }}>
              We&apos;re registering your stay with the property. You&apos;ll see your confirmation in a moment.
            </p>
          </div>
        </div>

        <p className="text-center mt-5" style={{ color: "#8C7B6B", fontSize: "11px", letterSpacing: "0.05em" }}>
          SECURE PAYMENT BY PAYSTACK
        </p>
      </div>

      <style>{`@keyframes blspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function PaymentProcessingPage() {
  return (
    <Suspense>
      <ProcessingContent />
    </Suspense>
  )
}
