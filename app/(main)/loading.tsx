import { Playfair_Display } from "next/font/google"

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "700"] })

export default function Loading() {
  return (
    <div
      className={`${playfair.className} flex min-h-[50vh] items-center justify-center bg-[#0A0A0A] text-white`}
    >
      <p className="animate-pulse font-mono text-xs uppercase tracking-[0.2em] text-gold">
        Loading Boga Legaba…
      </p>
    </div>
  )
}
