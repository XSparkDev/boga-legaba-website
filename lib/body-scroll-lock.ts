let lockedScrollY = 0
let lockCount = 0

/** Reliable scroll lock for iOS/Android mobile menus. */
export function lockBodyScroll() {
  if (typeof document === "undefined") return
  lockCount += 1
  if (lockCount > 1) return

  lockedScrollY = window.scrollY
  const { body, documentElement } = document
  body.style.position = "fixed"
  body.style.top = `-${lockedScrollY}px`
  body.style.left = "0"
  body.style.right = "0"
  body.style.width = "100%"
  body.style.overflow = "hidden"
  documentElement.style.overflow = "hidden"
}

export function unlockBodyScroll() {
  if (typeof document === "undefined") return
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount > 0) return

  clearBodyScrollStyles()
  window.scrollTo(0, lockedScrollY)
}

/** Clears any stuck lock after refresh, bfcache restore, or route change. */
export function resetBodyScrollLock() {
  lockCount = 0
  if (typeof document === "undefined") return
  clearBodyScrollStyles()
}

function clearBodyScrollStyles() {
  const { body, documentElement } = document
  body.style.position = ""
  body.style.top = ""
  body.style.left = ""
  body.style.right = ""
  body.style.width = ""
  body.style.overflow = ""
  documentElement.style.overflow = ""
}
