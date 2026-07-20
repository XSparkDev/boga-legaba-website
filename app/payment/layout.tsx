import { Playfair_Display, DM_Sans, League_Spartan, Montserrat, Open_Sans } from "next/font/google"
import { Toaster } from "sonner"
import "../../app/globals.css"

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
})

// Boga Legaba Brand Guidelines — same three approved typefaces as the main
// site (see app/(main)/layout.tsx), so payment pages stay on-brand.
const leagueSpartan = League_Spartan({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-title",
  display: "swap",
})

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
})

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
})

export default function PaymentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${playfair.variable} ${dmSans.variable} ${leagueSpartan.variable} ${montserrat.variable} ${openSans.variable} min-h-[100dvh] font-body antialiased`}
      style={{ background: "#F2EDE4" }}
    >
      {children}
      <Toaster position="bottom-center" richColors closeButton />
    </div>
  )
}
