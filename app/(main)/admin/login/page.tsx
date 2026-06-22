"use client"

import { useState, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { Lock, Eye, EyeOff, LogIn, ArrowLeft } from "lucide-react"
import Link from "next/link"

function LoginForm() {
  const router = useRouter()
  const sp = useSearchParams()
  const from = sp.get("from") ?? "/admin/dashboard"

  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.push(from)
      } else {
        const data = (await res.json()) as { error?: string }
        setError(data.error ?? "Invalid password")
      }
    } catch {
      setError("Network error — check your connection")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      {/* Back to website */}
      <Link
        href="/stay"
        className="fixed top-5 left-5 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-white/40 backdrop-blur-sm transition-all hover:border-white/20 hover:text-white/70"
      >
        <ArrowLeft className="size-3.5" />
        Back to site
      </Link>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#b8973a]/20 ring-1 ring-[#b8973a]/30">
            <Lock className="size-6 text-[#b8973a]" />
          </div>
          <h1 className="mt-4 font-serif text-2xl font-bold text-white">Admin Access</h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-white/40">
            Boga Legaba Guest House
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-white/50"
              >
                Admin password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  autoComplete="current-password"
                  placeholder="Enter admin password"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 font-mono text-sm text-white placeholder:text-white/20 focus:border-[#b8973a]/50 focus:outline-none focus:ring-1 focus:ring-[#b8973a]/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading || !password}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#b8973a] px-6 py-3 font-mono text-sm font-semibold uppercase tracking-wider text-white shadow-md transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn className="size-4" />
                  Sign in
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-widest text-white/20">
          Internal use only
        </p>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
