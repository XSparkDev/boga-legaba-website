import type { Metadata } from 'next'
import { Playfair_Display, Cormorant_Garamond, DM_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { SiteNav } from '@v2/components/site-nav'
import { SiteFooter } from '@v2/components/site-footer'
import { WhatsAppFloat } from '@v2/components/whatsapp-float'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://www.bogalegaba.co.za'),
  title: {
    default: 'Boga Legaba Guest House & Conference Centre | Guest House in Mahikeng',
    template: '%s | Boga Legaba Guest House Mahikeng',
  },
  description:
    'Guest house in Mahikeng with 27 rooms across 3 properties, a conference venue for up to 80 delegates, and corporate & government accommodation in North West Province. Book directly for the best rates.',
  keywords: [
    'Guest house in Mahikeng',
    'Conference venue in Mahikeng',
    'Government accommodation Mahikeng',
    'Guesthouse Mahikeng',
    'Corporate accommodation North West Province',
  ],
  creator: 'X Spark',
  generator: 'X Spark',
  icons: {
    icon: '/logo1.svg',
    shortcut: '/logo1.svg',
    apple: '/logo1.svg',
  },
  openGraph: {
    title: 'Boga Legaba Guest House & Conference Centre',
    description:
      'Mahikeng’s most welcoming address — three properties, 27 rooms, one team. Conference, corporate & government accommodation.',
    type: 'website',
    locale: 'en_ZA',
  },
}

export const viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`bg-background ${playfair.variable} ${cormorant.variable} ${dmSans.variable}`}
    >
      <body className="font-sans antialiased">
        <SiteNav />
        {children}
        <SiteFooter />
        <WhatsAppFloat />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
