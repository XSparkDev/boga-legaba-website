import { Playfair_Display, DM_Sans } from "next/font/google"
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

export default function PaymentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${playfair.variable} ${dmSans.variable} min-h-[100dvh] font-body antialiased`}
      style={{ background: "#F2EDE4" }}
    >
      {children}
    </div>
  )
}
