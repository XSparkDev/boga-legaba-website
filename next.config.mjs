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
  outputFileTracingExcludes: {
    "*": ["./services/nightsbridge-sync/.venv/**", "./services/nightsbridge-sync/output/**"],
  },
}

export default nextConfig
