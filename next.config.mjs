/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Production host does not serve Next's /_next/image optimizer endpoint,
    // so image optimization MUST stay off — enabling it makes every image
    // 404. Compression is handled by shrinking the source files instead.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        // Admin-uploaded site images live in Supabase Storage.
        protocol: "https",
        hostname: "tserpdstcpcdivujpswq.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  outputFileTracingExcludes: {
    "*": ["./services/nightsbridge-sync/.venv/**", "./services/nightsbridge-sync/output/**"],
  },
  // Let browsers cache the photo files so repeat visits don't re-download them.
  // Only adds a Cache-Control header to already-served static images — it can't
  // stop an image from loading. stale-while-revalidate keeps them fresh.
  async headers() {
    const cache = [
      { key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" },
    ]
    return [
      { source: "/Organized/:path*", headers: cache },
      { source: "/boga_hero_/:path*", headers: cache },
    ]
  },
}

export default nextConfig
