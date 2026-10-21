import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ExternalLink } from "lucide-react"
import { DiningSectionsClient } from "@/components/admin/dining-sections-client"

export const metadata: Metadata = {
  title: "Dining Sections | Boga Legaba Admin",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

async function isAuthenticated() {
  const store = await cookies()
  return store.get("bl_admin_session")?.value === process.env.ADMIN_SECRET
}

export default async function AdminDiningPage() {
  if (!(await isAuthenticated())) redirect("/admin/login")

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-mono text-[11px] text-gray-600 transition-colors hover:text-gray-900"
          >
            <ChevronLeft className="size-3.5" />
            Dashboard
          </Link>
          <a
            href="/dining"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-mono text-[11px] text-gray-600 transition-colors hover:text-gray-900"
          >
            View dining page
            <ExternalLink className="size-3" />
          </a>
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#996948]">
          Admin / Content
        </p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-gray-900">Dining page cards</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
          Edit the cards visitors see on the Dining page - rename them, rewrite the descriptions,
          switch icons, mark a venue as open instead of coming soon, hide a card, reorder them, or
          add new ones. Changes appear on the site as soon as you save.
        </p>

        <div className="mt-6">
          <DiningSectionsClient />
        </div>
      </div>
    </div>
  )
}
