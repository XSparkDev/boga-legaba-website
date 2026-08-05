import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { SITE_URL } from "@/lib/seo"
import { StructuredData } from "@/components/seo/structured-data"

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
}

const TITLE = "Boga Legaba Guest House & Conference Centre | Guest House in Mahikeng"
const DESCRIPTION =
  "Premium guest house and conference venue in Mahikeng, North West Province. 27 rooms across 3 properties. Corporate & government accommodation, conferences up to 80 delegates. Book directly for the best rates."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "Guest house in Mahikeng",
    "Conference venue in Mahikeng",
    "Government accommodation Mahikeng",
    "Guesthouse Mahikeng",
    "Corporate accommodation North West Province",
  ],
  authors: [{ name: "X Spark" }],
  creator: "X Spark",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    type: "website",
    siteName: "Boga Legaba Guest House & Conference Centre",
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: "en_ZA",
    images: [{ url: "/hero-exterior.png", width: 1200, height: 630, alt: "Boga Legaba Guest House, Mahikeng" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/hero-exterior.png"],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-[100dvh] antialiased">
        <StructuredData />
        {children}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
