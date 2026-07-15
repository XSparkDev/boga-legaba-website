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
}

export default nextConfig
