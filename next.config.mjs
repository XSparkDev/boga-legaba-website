/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Next serves resized, modern-format (AVIF/WebP) versions of every
    // next/image on demand — compresses the heavy HDR source photos so pages
    // load faster. Originals in /public are left untouched.
    formats: ["image/avif", "image/webp"],
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
