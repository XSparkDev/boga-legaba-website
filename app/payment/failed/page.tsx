"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { AlertTriangle } from "lucide-react"

function FailedContent() {
  const params = useSearchParams()
  const bookingRef = params.get("bookingRef") ?? ""

  return (
    <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-[#1a3a2a] px-6 py-6 text-center">
          <p className="text-[#d4a843] text-xl tracking-widest font-normal" style={{ fontFamily: "Georgia, serif" }}>
            BOGA LEGABA
          </p>
          <p className="text-[#a8c5b4] text-xs tracking-widest mt-1">PRIVATE GAME LODGE</p>
        </div>

        {/* Red banner */}
        <div className="bg-red-500 px-6 py-4 text-center">
          <AlertTriangle className="mx-auto mb-1 size-7 text-white" />
          <p className="text-white font-bold text-lg">Payment Failed</p>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <p className="text-gray-700 text-sm mb-4">
            Your payment could not be processed. Don&apos;t worry — your booking on NightsBridge is still held as
            &ldquo;Waiting for Payment&rdquo;. You can try again or pay via bank transfer.
          </p>

          {bookingRef && (
            <div className="bg-[#f9f7f2] rounded-xl border border-gray-100 px-4 py-3 mb-4">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Booking Reference</p>
              <p className="text-sm font-semibold text-gray-900">{bookingRef}</p>
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={() => window.history.back()}
              className="flex w-full items-center justify-center rounded-xl bg-[#b8973a] px-6 py-3 text-sm font-semibold text-white hover:brightness-110 transition-all"
            >
              Try payment again
            </button>
            <a
              href="/"
              className="flex w-full items-center justify-center rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
            >
              Back to home
            </a>
          </div>
        </div>
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
