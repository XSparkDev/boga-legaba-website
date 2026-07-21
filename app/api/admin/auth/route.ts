import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createSupabaseAnonClient } from "@/lib/supabase/client"

const ADMIN_SESSION_COOKIE = "bl_admin_session"
const SESSION_MAX_AGE = 60 * 60 * 8 // 8 hours

export async function POST(request: NextRequest) {
  try {
    const { email, password } = (await request.json()) as { email?: string; password?: string }
    const adminSecret = process.env.ADMIN_SECRET

    if (!adminSecret) {
      return NextResponse.json(
        { error: "Admin not configured. Set ADMIN_SECRET in .env.local" },
        { status: 500 },
      )
    }

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Verify credentials against Supabase Auth — the password is stored/hashed
    // by Supabase, never in this codebase or an env var. A successful sign-in is
    // all we need: the existing bl_admin_session cookie stays the session
    // mechanism, so every admin page and API route keeps authorising exactly as
    // before (nothing downstream changes).
    const supabase = createSupabaseAnonClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data?.user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const res = NextResponse.json({ success: true })
    res.cookies.set(ADMIN_SESSION_COOKIE, adminSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    })
    return res
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.delete(ADMIN_SESSION_COOKIE)
  return res
}
