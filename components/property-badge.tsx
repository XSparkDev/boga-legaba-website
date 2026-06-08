import { cn } from "@/lib/utils"
import type { Property } from "@/data/rooms"

interface PropertyBadgeProps {
  property: Pick<Property, "name" | "colorHex">
  className?: string
  size?: "sm" | "md"
}

export function PropertyBadge({ property, className, size = "sm" }: PropertyBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-mono uppercase tracking-wider",
        size === "sm" ? "px-2.5 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
        className,
      )}
      style={{
        borderColor: property.colorHex,
        color: property.colorHex,
        backgroundColor: `${property.colorHex}14`,
      }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: property.colorHex }} aria-hidden="true" />
      {property.name}
    </span>
  )
}
