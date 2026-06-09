import { Playfair_Display, DM_Sans, IBM_Plex_Mono } from "next/font/google"
import { BodyScrollReset } from "@/components/body-scroll-reset"
import { SiteNav } from "@/components/site-nav"
import { SiteFooter } from "@/components/site-footer"
import { FloatingWhatsApp } from "@/components/floating-whatsapp"
import { Toaster } from "sonner"
import "../globals.css"

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

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
})

export default function MainSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-site="main"
      className={`${playfair.variable} ${dmSans.variable} ${ibmPlexMono.variable} min-h-[100dvh] overflow-x-clip bg-background font-body antialiased`}
    >
      <BodyScrollReset />
      <SiteNav />
      {children}
      <SiteFooter />
      <FloatingWhatsApp />
      <Toaster position="bottom-center" richColors closeButton />
    </div>
  )
}
