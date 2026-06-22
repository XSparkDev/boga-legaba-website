"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

export function AdminSignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    await fetch("/api/admin/auth", { method: "DELETE" })
    router.push("/admin/login")
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] text-white/40 hover:text-white/70 transition-colors"
    >
      <LogOut className="size-3.5" />
      Sign out
    </button>
  )
}
