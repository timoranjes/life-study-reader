/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Note: Comment out 'output: export' for API routes to work
  // If you need static export, the TTS API will need to be hosted separately
  // output: 'export',
  // trailingSlash: true, // Disabled to fix API route redirects
  experimental: {
    // Enable server actions for API routes
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Turbopack config (Next.js 16 uses Turbopack by default)
  turbopack: {
    // Add any turbopack-specific config here if needed
  },
  // Transpile the edge-tts package
  transpilePackages: ['edge-tts'],
}

export default nextConfig
