/** Build a sized Unsplash CDN URL (images sourced via Unsplash API research). */
export function unsplashUrl(photoId: string, width = 1600) {
  return `https://images.unsplash.com/${photoId}?w=${width}&q=85&auto=format&fit=crop`
}
