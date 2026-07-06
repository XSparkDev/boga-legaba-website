import { ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface PlaceholderImageProps {
  label: string
  className?: string
  /** Optional accent color (hex) shown as a thin top border / icon tint */
  accent?: string
}

/**
 * Labeled image placeholder.
 * Replace with a real <Image /> when production photography is available.
 */
export function PlaceholderImage({ label, className, accent }: PlaceholderImageProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-stone-200 text-stone-500",
        className,
      )}
      role="img"
      aria-label={label}
    >
      {accent ? <span className="absolute left-0 top-0 h-1 w-full" style={{ backgroundColor: accent }} /> : null}
      <div className="relative flex flex-col items-center gap-2 px-4 text-center">
        <ImageIcon className="size-6 opacity-50" aria-hidden="true" />
        <span className="font-mono text-[11px] uppercase tracking-widest text-stone-500">{label}</span>
      </div>
    </div>
  )
}
