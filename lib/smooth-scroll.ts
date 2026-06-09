import { prefersReducedMotion } from "@/lib/reveal-observer"

export function scrollToElement(id: string, options?: ScrollIntoViewOptions) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({
    block: "start",
    ...options,
    behavior: prefersReducedMotion() ? "auto" : (options?.behavior ?? "smooth"),
  })
}
