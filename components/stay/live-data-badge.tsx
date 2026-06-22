"use client"

import { cn } from "@/lib/utils"

type LiveDataBadgeProps = {
  label?: string
  className?: string
  pulse?: boolean
}

/** Visual indicator that content is loaded from Supabase (synced NightsBridge data). */
export function LiveDataBadge({
  label = "Live · Supabase",
  className,
  pulse = true,
}: LiveDataBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-emerald-600/35 bg-emerald-600/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-emerald-800",
        className,
      )}
      title="Data loaded from our database, synced from NightsBridge"
    >
      <span className="relative flex size-1.5 shrink-0" aria-hidden>
        {pulse ? (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-50" />
        ) : null}
        <span className="relative size-1.5 rounded-full bg-emerald-600" />
      </span>
      {label}
    </span>
  )
}
