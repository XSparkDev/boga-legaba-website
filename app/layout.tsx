import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: "Boga Legaba Guest House & Conference Centre | Guest House in Mahikeng",
  description:
    "Premium guest house and conference venue in Mahikeng (Mafikeng), North West Province. 27 rooms across 3 properties. Corporate & government accommodation, conferences up to 80 delegates. Book directly for the best rates.",
  keywords: [
    "Guest house in Mahikeng",
    "Conference venue in Mahikeng",
    "Government accommodation Mahikeng",
    "Guesthouse Mafikeng",
    "Corporate accommodation North West Province",
  ],
  authors: [{ name: "X Spark" }],
  creator: "X Spark",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {children}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
