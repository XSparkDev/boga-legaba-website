/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  turbopack: {
    root: import.meta.dirname,
  },
  outputFileTracingExcludes: {
    "*": ["./services/nightsbridge-sync/.venv/**", "./services/nightsbridge-sync/output/**"],
  },
}

export default nextConfig
