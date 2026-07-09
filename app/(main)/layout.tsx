import { League_Spartan, Montserrat, Open_Sans } from "next/font/google"
import { BodyScrollReset } from "@/components/body-scroll-reset"
import { MainSiteChrome } from "@/components/main-site-chrome"
import { Toaster } from "sonner"
import "../globals.css"

// Boga Legaba Brand Guidelines — three approved typefaces.
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

export default function MainSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-site="main"
      className={`${leagueSpartan.variable} ${montserrat.variable} ${openSans.variable} min-h-[100dvh] overflow-x-clip bg-background font-body antialiased`}
    >
      <BodyScrollReset />
      <MainSiteChrome>{children}</MainSiteChrome>
      <Toaster position="bottom-center" richColors closeButton />
    </div>
  )
}
