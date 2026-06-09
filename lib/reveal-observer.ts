export function prefersReducedMotion() {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** Above-the-fold content should appear immediately (avoids blank headers on mobile refresh). */
export function isElementInViewport(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  const viewHeight = window.innerHeight || document.documentElement.clientHeight
  return rect.top < viewHeight * 0.92 && rect.bottom > 0
}

export function createRevealObserver(
  el: HTMLElement,
  onVisible: () => void,
): IntersectionObserver | null {
  if (prefersReducedMotion() || isElementInViewport(el)) {
    onVisible()
    return null
  }

  const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        onVisible()
        observer.disconnect()
      }
    },
    {
      threshold: isCoarsePointer ? 0.05 : 0.12,
      rootMargin: isCoarsePointer ? "0px 0px 0px 0px" : "0px 0px -40px 0px",
    },
  )
  observer.observe(el)
  return observer
}
