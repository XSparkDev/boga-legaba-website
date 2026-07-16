"use client"

import { useEffect, useState } from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"

type StatusResponse = {
  status?: string
  error?: string
  bookingRef?: string
  guestName?: string
  guestEmail?: string
  checkin?: string
  checkout?: string
  roomTypeName?: string
}

function ProcessingContent() {
  const params = useSearchParams()
  const reference = params.get("reference") ?? ""
  const amount = params.get("amount") ?? ""
  const [slow, setSlow] = useState(false)
  const [failed, setFailed] = useState<string>("")

  useEffect(() => {
    if (!reference) {
      setFailed("Missing booking reference. Please start again.")
      return
    }

    const slowTimer = setTimeout(() => setSlow(true), 12_000)
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []

    const POLL_MS = 3_000
    // The worker now retries internally (up to 3 attempts) on ambiguous
    // failures before giving up, which can take up to ~340s worst case —
    // keep polling comfortably beyond that instead of giving up early.
    const MAX_POLLS = 130 // ~6.5 min

    async function goToPayment(d: {
      bookingRef?: string
      guestName?: string
      guestEmail?: string
      checkin?: string
      checkout?: string
      roomTypeName?: string
    }) {
      try {
        const res = await fetch("/api/payment/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: d.guestEmail ?? "",
            amountRands: Number(amount || 0),
            bookingRef: d.bookingRef ?? "",
            guestName: d.guestName ?? "",
            checkin: d.checkin ?? "",
            checkout: d.checkout ?? "",
            roomTypeName: d.roomTypeName ?? "",
          }),
        })
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; authorization_url?: string; error?: string }
        if (data.ok && data.authorization_url) {
          window.location.href = data.authorization_url
        } else {
          setFailed(data.error ?? "Your room is booked, but we couldn't start payment. Please contact us on WhatsApp.")
        }
      } catch {
        setFailed("Your room is booked, but we couldn't start payment. Please contact us on WhatsApp.")
      }
    }

    async function poll(attempt: number): Promise<void> {
      if (cancelled) return
      try {
        const res = await fetch(`/api/booking/status?reference=${encodeURIComponent(reference)}`, { cache: "no-store" })
        const d = (await res.json().catch(() => ({}))) as StatusResponse
        if (cancelled) return
        if (d.status === "completed") {
          return void goToPayment(d)
        }
        if (d.status === "failed") {
          setFailed(d.error || "We couldn't book this room. Please try again or contact us on WhatsApp.")
          return
        }
        // status is "processing" (or missing/unrecognised) — keep polling.
      } catch {
        /* transient network error — keep polling */
      }
      if (cancelled) return
      if (attempt >= MAX_POLLS) {
        setFailed("This is taking longer than expected. Please contact us on WhatsApp with your details.")
        return
      }
      timers.push(setTimeout(() => poll(attempt + 1), POLL_MS))
    }

    poll(0)

    return () => {
      cancelled = true
      clearTimeout(slowTimer)
      timers.forEach(clearTimeout)
    }
  }, [reference, amount])

  if (failed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-5" style={{ background: "#F2EDE4" }}>
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 40px rgba(0,0,0,0.10)" }}>
            <div className="px-8 py-7 text-center" style={{ background: "#0A0A0A" }}>
              <p className="tracking-[0.25em] font-normal" style={{ fontFamily: "var(--font-playfair), Georgia, serif", color: "#C9A84C", fontSize: "20px" }}>
                BOGA LEGABA
              </p>
              <p className="tracking-[0.18em] mt-1" style={{ color: "#8C7B6B", fontSize: "10px" }}>
                GUEST HOUSE &amp; CONFERENCE CENTRE
              </p>
              <div className="mx-auto mt-4" style={{ height: "1px", width: "48px", background: "#C9A84C", opacity: 0.6 }} />
            </div>
            <div className="px-8 pt-8 pb-8 text-center">
              <div
                className="mx-auto mb-4 flex items-center justify-center rounded-full"
                style={{ width: 56, height: 56, background: "#FEF2F2", border: "2px solid #FCA5A5" }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 9v4M12 17h.01" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#EF4444" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="font-normal mb-2" style={{ fontFamily: "var(--font-playfair), Georgia, serif", color: "#0A0A0A", fontSize: "24px" }}>
                We hit a snag
              </h1>
              <p style={{ color: "#8C7B6B", fontSize: "13px", lineHeight: 1.7 }}>{failed}</p>
            </div>
            <div className="px-6 pb-7 space-y-3">
              <a
                href="/book-now"
                className="flex w-full items-center justify-center rounded-xl py-3.5 text-sm font-semibold transition-all hover:brightness-110"
                style={{ background: "#C9A84C", color: "#0A0A0A", letterSpacing: "0.04em" }}
              >
                Try Again
              </a>
              <a
                href="https://wa.me/27828757018"
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center rounded-xl py-3.5 text-sm transition-all"
                style={{ background: "#F2EDE4", color: "#8C7B6B", border: "1px solid #E8E0D4", letterSpacing: "0.02em" }}
              >
                Contact Us on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5" style={{ background: "#F2EDE4" }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 40px rgba(0,0,0,0.10)" }}>
          <div className="px-8 py-7 text-center" style={{ background: "#0A0A0A" }}>
            <p className="tracking-[0.25em] font-normal" style={{ fontFamily: "var(--font-playfair), Georgia, serif", color: "#C9A84C", fontSize: "20px" }}>
              BOGA LEGABA
            </p>
            <p className="tracking-[0.18em] mt-1" style={{ color: "#8C7B6B", fontSize: "10px" }}>
              GUEST HOUSE &amp; CONFERENCE CENTRE
            </p>
            <div className="mx-auto mt-4" style={{ height: "1px", width: "48px", background: "#C9A84C", opacity: 0.6 }} />
          </div>

          <div className="px-8 pt-10 pb-10 text-center">
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
            <h1 className="font-normal mb-2" style={{ fontFamily: "var(--font-playfair), Georgia, serif", color: "#0A0A0A", fontSize: "24px" }}>
              Reserving your room
            </h1>
            <p style={{ color: "#3D3532", fontSize: "14px", fontWeight: 600, lineHeight: 1.6, margin: "0 0 6px" }}>
              Please don&apos;t close or refresh this page.
            </p>
            <p style={{ color: "#8C7B6B", fontSize: "13px", lineHeight: 1.7 }}>
              We&apos;re registering your stay with the property.
              {slow ? " This can take a minute or two, hang tight." : ""}
            </p>
          </div>

          <div className="mx-6 mb-6 px-4 py-3 rounded-xl" style={{ background: "#F2EDE4", border: "1px solid #E8E0D4" }}>
            <p style={{ margin: 0, fontSize: "11px", color: "#8C7B6B", lineHeight: 1.6, textAlign: "center" }}>
              Once your room is confirmed, you&apos;ll be taken to secure payment.
            </p>
          </div>
        </div>
      </div>

      <style>{`@keyframes blspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function BookingProcessingPage() {
  return (
    <Suspense>
      <ProcessingContent />
    </Suspense>
  )
}
