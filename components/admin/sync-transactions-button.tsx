"use client"

import { useState } from "react"
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react"

export function SyncTransactionsButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [msg, setMsg] = useState("")

  async function handleSync() {
    setState("loading")
    setMsg("")
    try {
      const res = await fetch("/api/admin/sync-transactions", { method: "POST" })
      const json = await res.json()
      if (json.success) {
        setState("done")
        setMsg(json.summary ?? "Sync complete.")
        // Refresh the page to show new data
        setTimeout(() => window.location.reload(), 2000)
      } else {
        setState("error")
        setMsg(json.error ?? "Sync failed.")
      }
    } catch (e) {
      setState("error")
      setMsg("Network error, check console.")
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={handleSync}
        disabled={state === "loading"}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-mono text-[11px] text-gray-600 shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <RefreshCw className={`size-3.5 ${state === "loading" ? "animate-spin" : ""}`} />
        {state === "loading" ? "Syncing…" : "Sync from NightsBridge"}
      </button>
      {state === "done" && (
        <div className="flex items-center gap-1 font-mono text-[10px] text-emerald-600">
          <CheckCircle2 className="size-3" />
          Synced · reloading…
        </div>
      )}
      {state === "error" && (
        <div className="flex items-center gap-1 font-mono text-[10px] text-red-500">
          <AlertCircle className="size-3" />
          {msg.slice(0, 80)}
        </div>
      )}
    </div>
  )
}
