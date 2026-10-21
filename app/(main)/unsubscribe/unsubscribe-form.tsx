"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, AlertTriangle, MailMinus } from "lucide-react"

/**
 * One-click mailing-list removal (linked from every guest email footer).
 * POSTs to /api/unsubscribe; the address comes prefilled from ?email= but
 * stays editable so forwarded emails still work. The mailto fallback is
 * always shown, so a backend failure never leaves anyone subscribed against
 * their will.
 */
export function UnsubscribeForm({ prefill }: { prefill: string }) {
  const [email, setEmail] = useState(prefill)
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle")
  const [error, setError] = useState("")

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address.")
      setState("error")
      return
    }
    setState("working")
    setError("")
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok: boolean; error?: string }
      if (!data.ok) {
        setError(data.error ?? "Could not unsubscribe. Please email us instead.")
        setState("error")
        return
      }
      setState("done")
    } catch {
      setError("Network error. Please email us instead.")
      setState("error")
    }
  }

  if (state === "done") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-gold/40 bg-gold/10 p-10 text-center">
        <CheckCircle2 className="size-12 text-gold" />
        <h2 className="font-serif text-2xl text-foreground">You&apos;re unsubscribed.</h2>
        <p className="max-w-md text-pretty leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">{email}</span> will receive no further
          mailing-list emails from us. Transactional messages about bookings you make are unaffected.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Email address</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full min-w-0 rounded-lg border border-border bg-card px-4 py-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
      </label>
      {state === "error" ? (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" /> {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={state === "working"}
        className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-gold px-7 py-3 text-sm font-semibold text-[#000000] transition-colors hover:bg-[#b8943c] disabled:opacity-60"
      >
        {state === "working" ? <Loader2 className="size-4 animate-spin" /> : <MailMinus className="size-4" />}
        {state === "working" ? "Removing…" : "Unsubscribe me"}
      </button>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Trouble with the button? Email{" "}
        <a href="mailto:info@bogalegaba.co.za" className="underline underline-offset-2">
          info@bogalegaba.co.za
        </a>{" "}
        and we will remove you manually.
      </p>
    </form>
  )
}
