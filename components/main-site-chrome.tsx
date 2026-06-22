"use client"

import { usePathname } from "next/navigation"
import { SiteNav } from "@/components/site-nav"
import { SiteFooter } from "@/components/site-footer"
import { FloatingWhatsApp } from "@/components/floating-whatsapp"

export function MainSiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith("/admin")

  if (isAdmin) {
    return <>{children}</>
  }

  return (
    <>
      <SiteNav />
      {children}
      <SiteFooter />
      <FloatingWhatsApp />
    </>
  )
}
