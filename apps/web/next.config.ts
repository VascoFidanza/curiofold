import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ['@curiofold/config', '@curiofold/ui'],
}

export default nextConfig
