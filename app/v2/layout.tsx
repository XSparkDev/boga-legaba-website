import type { Metadata } from "next"
import { Playfair_Display, Cormorant_Garamond, DM_Sans } from "next/font/google"
import { Toaster } from "sonner"
import { SiteNav } from "@v2/components/site-nav"
import { SiteFooter } from "@v2/components/site-footer"
import { WhatsAppFloat } from "@v2/components/whatsapp-float"
import "./v2-globals.css"

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
})

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Boga Legaba (Website 2) | Guest House in Mahikeng",
    template: "%s | Boga Legaba Website 2",
  },
  description:
    "Alternate Boga Legaba experience — guest house and conference venue in Mahikeng with 27 rooms across 3 properties.",
  icons: {
    icon: "/logo1.svg",
    shortcut: "/logo1.svg",
    apple: "/logo1.svg",
  },
}

export default function V2SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-site="v2"
      className={`${playfair.variable} ${cormorant.variable} ${dmSans.variable} min-h-screen overflow-x-clip bg-cream font-sans text-deep-earth antialiased`}
    >
      <SiteNav />
      {children}
      <SiteFooter />
      <WhatsAppFloat />
      <Toaster position="bottom-center" richColors closeButton />
    </div>
  )
}
