import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const ADMIN_SESSION_COOKIE = "bl_admin_session"
const SESSION_MAX_AGE = 60 * 60 * 8 // 8 hours

export async function POST(request: NextRequest) {
  try {
    const { password } = (await request.json()) as { password?: string }
    const adminPassword = process.env.ADMIN_PASSWORD
    const adminSecret = process.env.ADMIN_SECRET

    if (!adminPassword || !adminSecret) {
      return NextResponse.json(
        { error: "Admin not configured. Set ADMIN_PASSWORD and ADMIN_SECRET in .env.local" },
        { status: 500 },
      )
    }

    if (!password || password !== adminPassword) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 })
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
