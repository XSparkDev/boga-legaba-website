import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function AdminIndexPage() {
  const store = await cookies()
  const session = store.get("bl_admin_session")?.value
  if (session === process.env.ADMIN_SECRET) {
    redirect("/admin/dashboard")
  }
  redirect("/admin/login")
}
