import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { RefreshReviewsButton } from "@/components/admin/refresh-reviews-button"

export const dynamic = "force-dynamic"

async function isAuthenticated() {
  const store = await cookies()
  return store.get("bl_admin_session")?.value === process.env.ADMIN_SECRET
}

export default async function AdminReviewsPage() {
  if (!(await isAuthenticated())) redirect("/admin/login")

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-30 border-b border-white/10 bg-[#000000] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <Link href="/admin/dashboard" className="flex items-center gap-1 font-mono text-[11px] text-white/60 hover:text-white">
            <ChevronLeft className="size-3.5" /> Dashboard
          </Link>
          <span className="font-serif text-base font-bold text-white">Reviews</span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <p className="mb-2 font-serif text-lg font-bold text-gray-900">Homepage guest reviews</p>
        <p className="mb-6 max-w-xl font-mono text-[11px] leading-relaxed text-gray-400">
          The homepage shows a curated set of reviews by default. Use the button below to pull the latest reviews
          from Google on demand. This never runs automatically. It only syncs when you click it.
        </p>

        <RefreshReviewsButton />
      </div>
    </div>
  )
}
